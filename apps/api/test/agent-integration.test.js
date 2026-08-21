import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import pool from "../src/db/pool.js";
import { executeAgentTool } from "../src/agent/service.js";

let userA;
let userB;
let workspaceA;
let workspaceB;
let projectA;
let projectB;
let taskA;
let taskB;

before(async () => {
  // Create isolated test users.
  const users = await pool.query(`
    INSERT INTO users (
      email,
      password_hash
    )
    VALUES
      ('agent-test-a@example.com', 'test-password-hash'),
      ('agent-test-b@example.com', 'test-password-hash')
    RETURNING id, email
  `);

  userA = users.rows[0];
  userB = users.rows[1];

  // Create two separate workspaces.
  const workspaces = await pool.query(`
    INSERT INTO workspaces (name)
    VALUES
      ('Agent Security Test Workspace A'),
      ('Agent Security Test Workspace B')
    RETURNING id, name
  `);

  workspaceA = workspaces.rows[0];
  workspaceB = workspaces.rows[1];

  // User A belongs only to Workspace A.
  await pool.query(
    `
      INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role
      )
      VALUES ($1, $2, 'OWNER')
    `,
    [workspaceA.id, userA.id]
  );

  // User B belongs only to Workspace B.
  await pool.query(
    `
      INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role
      )
      VALUES ($1, $2, 'OWNER')
    `,
    [workspaceB.id, userB.id]
  );

  // Create one project in each workspace.
  const projects = await pool.query(
    `
      INSERT INTO projects (
        workspace_id,
        name
      )
      VALUES
        ($1, 'Workspace A Project'),
        ($2, 'Workspace B Project')
      RETURNING id, workspace_id, name
    `,
    [workspaceA.id, workspaceB.id]
  );

  projectA = projects.rows[0];
  projectB = projects.rows[1];

  // Create one task in each project.
  const tasks = await pool.query(
    `
      INSERT INTO tasks (
        project_id,
        title,
        status
      )
      VALUES
        ($1, 'Workspace A Task', 'TODO'),
        ($2, 'Workspace B Task', 'TODO')
      RETURNING id, project_id, title
    `,
    [projectA.id, projectB.id]
  );

  taskA = tasks.rows[0];
  taskB = tasks.rows[1];
});

after(async () => {
  // Delete test data in dependency-safe order.
  await pool.query(
    `
      DELETE FROM agent_tool_calls
      WHERE workspace_id IN ($1, $2)
    `,
    [workspaceA.id, workspaceB.id]
  );

  await pool.query(
    `
      DELETE FROM workspaces
      WHERE id IN ($1, $2)
    `,
    [workspaceA.id, workspaceB.id]
  );

  await pool.query(
    `
      DELETE FROM users
      WHERE id IN ($1, $2)
    `,
    [userA.id, userB.id]
  );

  await pool.end();
});

test("OWNER can delete a task inside their workspace", async () => {
  const result = await executeAgentTool({
    workspaceId: workspaceA.id,
    userId: userA.id,
    role: "OWNER",
    toolName: "delete_task",
    arguments: {
      task_id: taskA.id
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.result.task.id, taskA.id);

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskA.id]
  );

  assert.equal(task.rowCount, 0);
});

test("cross-workspace task deletion is blocked", async () => {
  const result = await executeAgentTool({
    workspaceId: workspaceA.id,
    userId: userA.id,
    role: "OWNER",
    toolName: "delete_task",
    arguments: {
      task_id: taskB.id
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.error, "Resource not found");

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskB.id]
  );

  assert.equal(task.rowCount, 1);
});

test("MANAGER cannot delete a task", async () => {
  const result = await executeAgentTool({
    workspaceId: workspaceA.id,
    userId: userA.id,
    role: "MANAGER",
    toolName: "delete_task",
    arguments: {
      task_id: taskB.id
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 403);
  assert.equal(result.error, "Agent tool permission denied");

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskB.id]
  );

  assert.equal(task.rowCount, 1);
});

test("cross-workspace project deletion is blocked", async () => {
  const result = await executeAgentTool({
    workspaceId: workspaceA.id,
    userId: userA.id,
    role: "OWNER",
    toolName: "delete_project",
    arguments: {
      project_id: projectB.id
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 404);
  assert.equal(result.error, "Resource not found");

  const project = await pool.query(
    `
      SELECT id
      FROM projects
      WHERE id = $1
    `,
    [projectB.id]
  );

  assert.equal(project.rowCount, 1);
});

test("successful task deletion is written to the audit log", async () => {
  const result = await executeAgentTool({
    workspaceId: workspaceB.id,
    userId: userB.id,
    role: "OWNER",
    toolName: "delete_task",
    arguments: {
      task_id: taskB.id
    }
  });

  assert.equal(result.ok, true);

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        tool_name,
        action,
        resource_type,
        resource_id,
        authorization_result,
        status
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND user_id = $2
        AND tool_name = 'delete_task'
        AND resource_id = $3
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceB.id, userB.id, taskB.id]
  );

  assert.equal(audit.rowCount, 1);

  assert.deepEqual(audit.rows[0], {
    workspace_id: workspaceB.id,
    user_id: userB.id,
    tool_name: "delete_task",
    action: "TASK_DELETE",
    resource_type: "TASK",
    resource_id: taskB.id,
    authorization_result: "ALLOWED",
    status: "SUCCESS"
  });
});