import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import pool from "../src/db/pool.js";
import {
  createOAuthState,
  consumeOAuthState
} from "../src/oauth/state.js";

let user;

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
      VALUES (
        'oauth-state-test@example.com',
        'test-password-hash'
      )
      RETURNING id, email
    `
  );

  user = result.rows[0];
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
    provider: "github"
  });

  assert.equal(typeof state, "string");
  assert.ok(state.length > 20);
});

test("created OAuth state is stored hashed", async () => {
  const state = await createOAuthState({
    userId: user.id,
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
    provider: "github"
  });

  const consumed = await consumeOAuthState({
    state,
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
    provider: "github"
  });

  const first = await consumeOAuthState({
    state,
    provider: "github"
  });

  const second = await consumeOAuthState({
    state,
    provider: "github"
  });

  assert.ok(first);
  assert.equal(second, null);
});

test("OAuth state cannot be consumed for another provider", async () => {
  const state = await createOAuthState({
    userId: user.id,
    provider: "github"
  });

  const consumed = await consumeOAuthState({
    state,
    provider: "google"
  });

  assert.equal(consumed, null);
});

test("invalid OAuth state is rejected", async () => {
  const consumed = await consumeOAuthState({
    state: "invalid-state",
    provider: "github"
  });

  assert.equal(consumed, null);
});

test("expired OAuth state is rejected", async () => {
  const state = await createOAuthState({
    userId: user.id,
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
    provider: "github"
  });

  assert.equal(consumed, null);
});
