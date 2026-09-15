import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/app.js";
import pool from "../src/db/pool.js";
import { hashPassword } from "../src/auth/password.js";

let userA;
let userB;
let workspaceA;
let workspaceB;
let taskA;
let taskB;

before(async () => {
  await pool.query(`
    DELETE FROM users
    WHERE email IN (
      'agent-route-test-a@example.com',
      'agent-route-test-b@example.com'
    )
  `);

  const passwordHash = await hashPassword("test-password");

  const users = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash
      )
      VALUES
        ('agent-route-test-a@example.com', $1),
        ('agent-route-test-b@example.com', $1)
      RETURNING id, email
    `,
    [passwordHash]
  );

  userA = users.rows[0];
  userB = users.rows[1];

  const workspaces = await pool.query(`
    INSERT INTO workspaces (name)
    VALUES
      ('Agent Route Security Workspace A'),
      ('Agent Route Security Workspace B')
    RETURNING id, name
  `);

  workspaceA = workspaces.rows[0];
  workspaceB = workspaces.rows[1];

  await pool.query(
    `
      INSERT INTO workspace_members (
        workspace_id,
        user_id,
        role
      )
      VALUES
        ($1, $2, 'OWNER'),
        ($3, $4, 'OWNER')
    `,
    [
      workspaceA.id,
      userA.id,
      workspaceB.id,
      userB.id
    ]
  );

  const projects = await pool.query(
    `
      INSERT INTO projects (
        workspace_id,
        name
      )
      VALUES
        ($1, 'Route Security Project A'),
        ($2, 'Route Security Project B')
      RETURNING id, workspace_id
    `,
    [workspaceA.id, workspaceB.id]
  );

  const tasks = await pool.query(
    `
      INSERT INTO tasks (
        project_id,
        title,
        status
      )
      VALUES
        ($1, 'Route Security Task A', 'TODO'),
        ($2, 'Route Security Task B', 'TODO')
      RETURNING id, project_id
    `,
    [projects.rows[0].id, projects.rows[1].id]
  );

  taskA = tasks.rows[0];
  taskB = tasks.rows[1];
});

after(async () => {
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

test("agent route ignores client-supplied identity and authorization fields", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/tool`)
    .send({
      tool: "delete_task",
      arguments: {
        task_id: taskB.id
      },
      userId: userB.id,
      workspaceId: workspaceB.id,
      role: "OWNER",
      capabilities: [
        "TASK_DELETE"
      ]
    });

  assert.equal(response.status, 404);
  assert.equal(response.body.error, "Resource not found");

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskB.id]
  );

  assert.equal(task.rowCount, 1);

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        authorization_result,
        status
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND user_id = $2
        AND tool_name = 'delete_task'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id, userA.id]
  );

  assert.equal(audit.rowCount, 1);

  assert.equal(audit.rows[0].workspace_id, workspaceA.id);
  assert.equal(audit.rows[0].user_id, userA.id);
  assert.equal(audit.rows[0].authorization_result, "ALLOWED");
  assert.equal(audit.rows[0].status, "DENIED");
});

test("agent route enforces server-derived RBAC despite client-supplied owner role", async () => {
  await pool.query(
    `
      UPDATE workspace_members
      SET role = 'MANAGER'
      WHERE workspace_id = $1
        AND user_id = $2
    `,
    [workspaceA.id, userA.id]
  );

  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/tool`)
    .send({
      tool: "delete_task",
      arguments: {
        task_id: taskA.id
      },
      role: "OWNER",
      capabilities: [
        "TASK_DELETE"
      ]
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, "Agent tool permission denied");

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskA.id]
  );

  assert.equal(task.rowCount, 1);

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        authorization_result,
        status
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND user_id = $2
        AND tool_name = 'delete_task'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id, userA.id]
  );

  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].workspace_id, workspaceA.id);
  assert.equal(audit.rows[0].user_id, userA.id);
  assert.equal(audit.rows[0].authorization_result, "DENIED");
  assert.equal(audit.rows[0].status, "DENIED");
});


test("agent route rejects unauthenticated requests", async () => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceA.id}/agent/tool`)
    .send({
      tool: "delete_task",
      arguments: {
        task_id: taskA.id
      }
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Authentication required");

  const task = await pool.query(
    `
      SELECT id
      FROM tasks
      WHERE id = $1
    `,
    [taskA.id]
  );

  assert.equal(task.rowCount, 1);
});

test("agent route blocks cross-workspace resource access", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/tool`)
    .send({
      tool: "delete_task",
      arguments: {
        task_id: taskB.id
      }
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, "Agent tool permission denied");
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
