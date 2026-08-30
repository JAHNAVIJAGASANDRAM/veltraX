import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import pool from "../src/db/pool.js";
import {
  encryptSecret,
  decryptSecret
} from "../src/oauth/crypto.js";
import {
  upsertOAuthGrant,
  getOAuthGrant,
  revokeOAuthGrant
} from "../src/oauth/grants.js";

let user;

before(async () => {
  await pool.query(
    `
      DELETE FROM oauth_grants
      WHERE user_id IN (
        SELECT id
        FROM users
        WHERE email = $1
      )
    `,
    ["oauth-test@example.com"]
  );

  await pool.query(
    `
      DELETE FROM users
      WHERE email = $1
    `,
    ["oauth-test@example.com"]
  );

  const result = await pool.query(`
    INSERT INTO users (
      email,
      password_hash
    )
    VALUES (
      'oauth-test@example.com',
      'test-password-hash'
    )
    RETURNING id, email
  `);

  user = result.rows[0];
});

after(async () => {
  if (user) {
    await pool.query(
      `
        DELETE FROM oauth_grants
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

test("encryptSecret and decryptSecret round trip", () => {
  const secret = "oauth-access-token-test";

  const encrypted = encryptSecret(secret);

  assert.notEqual(encrypted, secret);
  assert.match(encrypted, /^v1\./);

  const decrypted = decryptSecret(encrypted);

  assert.equal(decrypted, secret);
});

test("encryptSecret produces different ciphertext for the same secret", () => {
  const secret = "same-oauth-token";

  const first = encryptSecret(secret);
  const second = encryptSecret(secret);

  assert.notEqual(first, second);

  assert.equal(decryptSecret(first), secret);
  assert.equal(decryptSecret(second), secret);
});

test("decryptSecret rejects tampered ciphertext", () => {
  const encrypted = encryptSecret("sensitive-token");

  const parts = encrypted.split(".");
  parts[3] = Buffer.from(
    crypto.randomBytes(32)
  ).toString("base64");

  const tampered = parts.join(".");

  assert.throws(
    () => decryptSecret(tampered)
  );
});

test("decryptSecret rejects invalid format", () => {
  assert.throws(
    () => decryptSecret("invalid-secret")
  );
});

test("upsertOAuthGrant stores an encrypted access token", async () => {
  const grant = await upsertOAuthGrant({
    userId: user.id,
    provider: "test-provider",
    providerUserId: "provider-user-1",
    accessToken: "access-token-123",
    scopes: ["read", "write"]
  });

  assert.equal(grant.userId, user.id);
  assert.equal(grant.provider, "test-provider");
  assert.equal(grant.providerUserId, "provider-user-1");
  assert.deepEqual(grant.scopes, ["read", "write"]);
  assert.equal(grant.revokedAt, null);

  const raw = await pool.query(
    `
      SELECT encrypted_access_token
      FROM oauth_grants
      WHERE id = $1
    `,
    [grant.id]
  );

  assert.equal(raw.rowCount, 1);
  assert.notEqual(
    raw.rows[0].encrypted_access_token,
    "access-token-123"
  );

  assert.equal(
    decryptSecret(raw.rows[0].encrypted_access_token),
    "access-token-123"
  );
});

test("getOAuthGrant decrypts the access token", async () => {
  const grant = await getOAuthGrant({
    userId: user.id,
    provider: "test-provider"
  });

  assert.ok(grant);
  assert.equal(grant.accessToken, "access-token-123");
  assert.deepEqual(grant.scopes, ["read", "write"]);
});

test("upsertOAuthGrant updates an existing provider grant", async () => {
  const grant = await upsertOAuthGrant({
    userId: user.id,
    provider: "test-provider",
    providerUserId: "provider-user-1",
    accessToken: "updated-access-token",
    scopes: ["read"]
  });

  assert.equal(grant.userId, user.id);
  assert.equal(grant.provider, "test-provider");
  assert.equal(grant.providerUserId, "provider-user-1");
  assert.deepEqual(grant.scopes, ["read"]);

  const fetched = await getOAuthGrant({
    userId: user.id,
    provider: "test-provider"
  });

  assert.ok(fetched);
  assert.equal(
    fetched.accessToken,
    "updated-access-token"
  );
  assert.deepEqual(fetched.scopes, ["read"]);
});

test("revokeOAuthGrant revokes the active grant", async () => {
  const revoked = await revokeOAuthGrant({
    userId: user.id,
    provider: "test-provider"
  });

  assert.ok(revoked);
  assert.equal(revoked.provider, "test-provider");
  assert.ok(revoked.revoked_at);
});

test("getOAuthGrant does not return revoked grants", async () => {
  const grant = await getOAuthGrant({
    userId: user.id,
    provider: "test-provider"
  });

  assert.equal(grant, null);
});

test("revoked grant can be restored by upsert", async () => {
  const grant = await upsertOAuthGrant({
    userId: user.id,
    provider: "test-provider",
    providerUserId: "provider-user-1",
    accessToken: "restored-access-token",
    scopes: ["read"]
  });

  assert.equal(grant.revokedAt, null);

  const fetched = await getOAuthGrant({
    userId: user.id,
    provider: "test-provider"
  });

  assert.ok(fetched);
  assert.equal(
    fetched.accessToken,
    "restored-access-token"
  );
  assert.deepEqual(fetched.scopes, ["read"]);
});
