import {
  createHash,
  randomBytes
} from "node:crypto";

import pool from "../db/pool.js";

const SESSION_TTL_MS = Number(
  process.env.SESSION_TTL_MS || 86400000
);

function hashSessionToken(token) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export async function createSession(userId) {
  const rawToken = randomBytes(32).toString("hex");
  const sessionId = hashSessionToken(rawToken);
  const expiresAt = getSessionExpiry();

  await pool.query(
    `
      INSERT INTO sessions (
        id,
        user_id,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [sessionId, userId, expiresAt]
  );

  return {
    token: rawToken,
    expiresAt
  };
}

export async function getSession(token) {
  if (!token) {
    return null;
  }

  const sessionId = hashSessionToken(token);

  const result = await pool.query(
    `
      SELECT
        sessions.id,
        sessions.user_id,
        sessions.expires_at,
        users.email
      FROM sessions
      INNER JOIN users
        ON users.id = sessions.user_id
      WHERE sessions.id = $1
        AND sessions.expires_at > CURRENT_TIMESTAMP
    `,
    [sessionId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const session = result.rows[0];

  await pool.query(
    `
      UPDATE sessions
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `,
    [sessionId]
  );

  return {
    id: session.id,
    userId: session.user_id,
    email: session.email,
    expiresAt: session.expires_at
  };
}

export async function deleteSession(token) {
  if (!token) {
    return;
  }

  const sessionId = hashSessionToken(token);

  await pool.query(
    `
      DELETE FROM sessions
      WHERE id = $1
    `,
    [sessionId]
  );
}