import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import pool from "../src/db/pool.js";
import { createSession } from "../src/auth/session.js";
import {
  createOAuthState,
  consumeOAuthState
} from "../src/oauth/state.js";

let user;
let sessionId;

before(async () => {
  await pool.query(
    `
      DELETE FROM users
      WHERE email = $1
    `,
    ["oauth-state-test@example.com"]
  );

  const result = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash
      )
      VALUES ($1, $2)
      RETURNING id, email
    `,
    ["oauth-state-test@example.com", "test-password-hash"]
  );

  user = result.rows[0];

  const session = await createSession(user.id);

  sessionId = crypto
    .createHash("sha256")
    .update(session.token)
    .digest("hex");
});

after(async () => {
  if (user) {
    await pool.query(
      `
        DELETE FROM users
        WHERE id = $1
      `,
      [user.id]
    );
  }

  await pool.end();
});

test("createOAuthState creates a random state", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  assert.equal(typeof state, "string");
  assert.ok(state.length > 20);
});

test("created OAuth state is stored hashed", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const stateHash = crypto
    .createHash("sha256")
    .update(state)
    .digest("hex");

  const result = await pool.query(
    `
      SELECT state_hash
      FROM oauth_states
      WHERE state_hash = $1
    `,
    [stateHash]
  );

  assert.equal(result.rowCount, 1);
  assert.notEqual(result.rows[0].state_hash, state);
});

test("consumeOAuthState returns the correct authenticated user", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const consumed = await consumeOAuthState({
    state,
    sessionId,
    provider: "github"
  });

  assert.ok(consumed);
  assert.equal(consumed.userId, user.id);
  assert.equal(consumed.provider, "github");
  assert.ok(consumed.usedAt);
});

test("OAuth state can only be consumed once", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const first = await consumeOAuthState({
    state,
    sessionId,
    provider: "github"
  });

  const second = await consumeOAuthState({
    state,
    sessionId,
    provider: "github"
  });

  assert.ok(first);
  assert.equal(second, null);
});

test("OAuth state cannot be consumed from another session", async () => {
  const otherSession = await createSession(user.id);

  const otherSessionId = crypto
    .createHash("sha256")
    .update(otherSession.token)
    .digest("hex");

  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const consumed = await consumeOAuthState({
    state,
    sessionId: otherSessionId,
    provider: "github"
  });

  assert.equal(consumed, null);

  await pool.query(
    `
      DELETE FROM sessions
      WHERE id = $1
    `,
    [otherSessionId]
  );
});

test("OAuth state cannot be consumed for another provider", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const consumed = await consumeOAuthState({
    state,
    sessionId,
    provider: "google"
  });

  assert.equal(consumed, null);
});

test("invalid OAuth state is rejected", async () => {
  const consumed = await consumeOAuthState({
    state: "invalid-state",
    sessionId,
    provider: "github"
  });

  assert.equal(consumed, null);
});

test("expired OAuth state is rejected", async () => {
  const state = await createOAuthState({
    userId: user.id,
    sessionId,
    provider: "github"
  });

  const stateHash = crypto
    .createHash("sha256")
    .update(state)
    .digest("hex");

  await pool.query(
    `
      UPDATE oauth_states
      SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 minute'
      WHERE state_hash = $1
    `,
    [stateHash]
  );

  const consumed = await consumeOAuthState({
    state,
    sessionId,
    provider: "github"
  });

  assert.equal(consumed, null);
});