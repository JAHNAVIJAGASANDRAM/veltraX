import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import request from "supertest";

import app from "../src/app.js";
import pool from "../src/db/pool.js";
import { hashPassword } from "../src/auth/password.js";

let user;

before(async () => {
  await pool.query(
    `
      DELETE FROM users
      WHERE email = $1
    `,
    ["oauth-route-test@example.com"]
  );

  const passwordHash = await hashPassword("test-password");

  const result = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash
      )
      VALUES (
        'oauth-route-test@example.com',
        $1
      )
      RETURNING id, email
    `,
    [passwordHash]
  );

  user = result.rows[0];
});

after(async () => {
  if (user) {
    await pool.query(
      `
        DELETE FROM oauth_states
        WHERE user_id = $1
      `,
      [user.id]
    );

    await pool.query(
      `
        DELETE FROM oauth_grants
        WHERE user_id = $1
      `,
      [user.id]
    );

    await pool.query(
      `
        DELETE FROM sessions
        WHERE user_id = $1
      `,
      [user.id]
    );

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

test("GitHub OAuth start requires authentication", async () => {
  const response = await request(app)
    .get("/api/oauth/github")
    .redirects(0);

  assert.equal(response.status, 401);
  assert.equal(
    response.body.error,
    "Authentication required"
  );
});

test("authenticated user receives GitHub OAuth redirect", async () => {
  const agent = request.agent(app);

  await agent
    .post("/api/auth/login")
    .send({
      email: "oauth-route-test@example.com",
      password: "test-password"
    })
    .expect(200);

  const response = await agent
    .get("/api/oauth/github")
    .redirects(0);

  assert.equal(response.status, 302);

  const location = response.headers.location;

  assert.ok(location);

  const authorizationUrl = new URL(location);

  assert.equal(
    authorizationUrl.origin,
    "https://github.com"
  );

  assert.equal(
    authorizationUrl.pathname,
    "/login/oauth/authorize"
  );

  assert.equal(
    authorizationUrl.searchParams.get("client_id"),
    process.env.GITHUB_CLIENT_ID
  );

  assert.equal(
    authorizationUrl.searchParams.get("redirect_uri"),
    process.env.GITHUB_OAUTH_REDIRECT_URI
  );

  assert.equal(
    authorizationUrl.searchParams.get("scope"),
    "read:user user:email"
  );

  const state =
    authorizationUrl.searchParams.get("state");

  assert.ok(state);
  assert.ok(state.length > 20);

  const stateHash = crypto
    .createHash("sha256")
    .update(state)
    .digest("hex");

  const result = await pool.query(
    `
      SELECT
        user_id,
        provider,
        state_hash,
        used_at,
        expires_at
      FROM oauth_states
      WHERE state_hash = $1
    `,
    [stateHash]
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0].user_id, user.id);
  assert.equal(result.rows[0].provider, "github");
  assert.equal(result.rows[0].state_hash, stateHash);
  assert.equal(result.rows[0].used_at, null);
});
