import test, { after, before, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/app.js";
import pool from "../src/db/pool.js";
import { hashPassword } from "../src/auth/password.js";

let userA;
let userB;
let workspaceA;
let workspaceB;
let projectA;
let projectB;
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

  projectA = projects.rows[0];
  projectB = projects.rows[1];

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


test("agent chat route requires an authenticated session", async () => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .send({ message: "List my projects" });

  assert.equal(response.status, 401);
  assert.equal(response.body.error, "Authentication required");
});

test("agent chat route rejects user without workspace membership", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  // userA is NOT a member of workspaceB
  const response = await agent
    .post(`/api/workspaces/${workspaceB.id}/agent/chat`)
    .send({ message: "List projects" });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, "Workspace access denied");
});

test("agent chat route validates content type and request body structure", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const nonJson = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .set("Content-Type", "text/plain")
    .send("message=hello");

  assert.equal(nonJson.status, 415);
  assert.equal(nonJson.body.error, "Content-Type must be application/json");

  const arrayBody = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .send([1, 2, 3]);

  assert.equal(arrayBody.status, 400);
  assert.equal(arrayBody.body.error, "Request body must be a JSON object");

  const emptyMsg = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .send({ message: "   " });

  assert.equal(emptyMsg.status, 400);
  assert.equal(emptyMsg.body.error, "message is required");

  const oversizedMsg = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .send({ message: "A".repeat(4001) });

  assert.equal(oversizedMsg.status, 400);
  assert.equal(oversizedMsg.body.error, "message must be 4000 characters or fewer");
});

test("agent chat route returns 503 when LLM provider is not configured", async () => {
  const originalKey = process.env.LLM_API_KEY;
  delete process.env.LLM_API_KEY;

  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .set("X-Request-Id", "corr-unconfigured-1")
    .send({ message: "List projects" });

  if (originalKey) {
    process.env.LLM_API_KEY = originalKey;
  }

  assert.equal(response.status, 503);
  assert.equal(response.body.error, "AI agent is not configured");
  assert.equal(response.body.requestId, "corr-unconfigured-1");
  assert.equal(response.headers["x-request-id"], "corr-unconfigured-1");
});

test("agent chat route with mocked provider executes tool and records audit with correlation ID", async () => {
  const originalKey = process.env.LLM_API_KEY;
  const originalUrl = process.env.LLM_API_URL;
  process.env.LLM_API_KEY = "test-agent-key";
  process.env.LLM_API_URL = "https://mock-llm.example.test/v1/chat/completions";

  let callCount = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    callCount += 1;
    if (callCount === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: "call_chat_audit_1",
                type: "function",
                function: { name: "list_projects", arguments: "{}" }
              }]
            },
            finish_reason: "tool_calls"
          }]
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: "You have 1 project.",
            tool_calls: []
          },
          finish_reason: "stop"
        }]
      })
    };
  };

  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/chat`)
    .set("X-Request-Id", "corr-chat-audit-456")
    .send({ message: "What projects exist?" });

  globalThis.fetch = originalFetch;
  if (originalKey) process.env.LLM_API_KEY = originalKey; else delete process.env.LLM_API_KEY;
  if (originalUrl) process.env.LLM_API_URL = originalUrl; else delete process.env.LLM_API_URL;

  assert.equal(response.status, 200);
  assert.equal(response.body.requestId, "corr-chat-audit-456");
  assert.equal(response.body.toolCalls.length, 1);
  assert.equal(response.body.toolCalls[0].tool, "list_projects");
  assert.equal(response.body.toolCalls[0].ok, true);
  assert.equal(response.body.message, "You have 1 project.");

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        tool_name,
        authorization_result,
        status,
        metadata
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND tool_name = 'list_projects'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id]
  );

  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].workspace_id, workspaceA.id);
  assert.equal(audit.rows[0].user_id, userA.id);
  assert.equal(audit.rows[0].status, "SUCCESS");
  assert.equal(audit.rows[0].metadata.requestId, "corr-chat-audit-456");
});

test("agent direct tool route audits unknown tools", async () => {
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
    .set("X-Request-Id", "corr-unknown-tool-1")
    .send({
      tool: "malicious_injected_tool",
      arguments: {}
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "Unknown agent tool");

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        tool_name,
        authorization_result,
        status,
        metadata
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND tool_name = 'malicious_injected_tool'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id]
  );

  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].workspace_id, workspaceA.id);
  assert.equal(audit.rows[0].user_id, userA.id);
  assert.equal(audit.rows[0].status, "UNKNOWN_TOOL");
  assert.equal(audit.rows[0].authorization_result, "DENIED");
  assert.equal(audit.rows[0].metadata.requestId, "corr-unknown-tool-1");
});

test("agent direct tool route isolates task assignment to workspace members", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "agent-route-test-a@example.com",
      password: "test-password"
    })
    .expect(200);

  // userB is not a member of workspaceA
  const response = await agent
    .post(`/api/workspaces/${workspaceA.id}/agent/tool`)
    .send({
      tool: "create_task",
      arguments: {
        project_id: projectA.id,
        title: "Cross Assign Task",
        assigned_to: userB.id
      }
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.error, "Assigned user is not a member of this workspace");

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        status,
        metadata
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND tool_name = 'create_task'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id]
  );

  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].status, "DENIED");
  assert.equal(audit.rows[0].metadata.reason, "ASSIGNEE_OUTSIDE_WORKSPACE");
});

test("agent direct tool route rejects invalid UUID in assigned_to", async () => {
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
      tool: "create_task",
      arguments: {
        project_id: projectA.id,
        title: "Bad Assignee",
        assigned_to: "not-a-uuid"
      }
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "assigned_to must be a valid UUID");

  const audit = await pool.query(
    `
      SELECT
        workspace_id,
        user_id,
        status
      FROM agent_tool_calls
      WHERE workspace_id = $1
        AND tool_name = 'create_task'
        AND status = 'INVALID_ARGUMENTS'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [workspaceA.id]
  );

  assert.equal(audit.rowCount, 1);
  assert.equal(audit.rows[0].status, "INVALID_ARGUMENTS");
});

