import crypto from "node:crypto";
import pool from "../db/pool.js";

const STATE_TTL_MS = 10 * 60 * 1000;

function hashState(state) {
  return crypto
    .createHash("sha256")
    .update(state)
    .digest("hex");
}

export async function createOAuthState({
  userId,
  provider
}) {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!provider) {
    throw new Error("provider is required");
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const stateHash = hashState(state);
  const expiresAt = new Date(
    Date.now() + STATE_TTL_MS
  );

  await pool.query(
    `
      INSERT INTO oauth_states (
        user_id,
        provider,
        state_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      userId,
      provider,
      stateHash,
      expiresAt
    ]
  );

  return state;
}

export async function consumeOAuthState({
  state,
  provider
}) {
  if (!state) {
    return null;
  }

  if (!provider) {
    throw new Error("provider is required");
  }

  const stateHash = hashState(state);

  const result = await pool.query(
    `
      UPDATE oauth_states
      SET used_at = CURRENT_TIMESTAMP
      WHERE state_hash = $1
        AND provider = $2
        AND used_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING
        id,
        user_id,
        provider,
        expires_at,
        used_at
    `,
    [
      stateHash,
      provider
    ]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const row = result.rows[0];

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    expiresAt: row.expires_at,
    usedAt: row.used_at
  };
}
