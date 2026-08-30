import pool from "../db/pool.js";
import {
  encryptSecret,
  decryptSecret
} from "./crypto.js";

export async function upsertOAuthGrant({
  userId,
  provider,
  providerUserId,
  accessToken,
  scopes = []
}) {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!provider) {
    throw new Error("provider is required");
  }

  if (!providerUserId) {
    throw new Error("providerUserId is required");
  }

  if (!accessToken) {
    throw new Error("accessToken is required");
  }

  if (!Array.isArray(scopes)) {
    throw new TypeError("scopes must be an array");
  }

  const encryptedAccessToken =
    encryptSecret(accessToken);

  const result = await pool.query(
    `
      INSERT INTO oauth_grants (
        user_id,
        provider,
        provider_user_id,
        encrypted_access_token,
        scopes,
        revoked_at
      )
      VALUES ($1, $2, $3, $4, $5, NULL)
      ON CONFLICT (provider, provider_user_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        encrypted_access_token = EXCLUDED.encrypted_access_token,
        scopes = EXCLUDED.scopes,
        revoked_at = NULL,
        updated_at = current_timestamp
      RETURNING
        id,
        user_id,
        provider,
        provider_user_id,
        scopes,
        created_at,
        updated_at,
        revoked_at
    `,
    [
      userId,
      provider,
      providerUserId,
      encryptedAccessToken,
      scopes
    ]
  );

  const grant = result.rows[0];

  return {
    id: grant.id,
    userId: grant.user_id,
    provider: grant.provider,
    providerUserId: grant.provider_user_id,
    scopes: grant.scopes,
    createdAt: grant.created_at,
    updatedAt: grant.updated_at,
    revokedAt: grant.revoked_at
  };
}

export async function getOAuthGrant({
  userId,
  provider
}) {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        provider,
        provider_user_id,
        encrypted_access_token,
        scopes,
        created_at,
        updated_at,
        revoked_at
      FROM oauth_grants
      WHERE user_id = $1
        AND provider = $2
        AND revoked_at IS NULL
      LIMIT 1
    `,
    [userId, provider]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const grant = result.rows[0];

  return {
    id: grant.id,
    userId: grant.user_id,
    provider: grant.provider,
    providerUserId: grant.provider_user_id,
    accessToken: decryptSecret(
      grant.encrypted_access_token
    ),
    scopes: grant.scopes,
    createdAt: grant.created_at,
    updatedAt: grant.updated_at,
    revokedAt: grant.revoked_at
  };
}

export async function revokeOAuthGrant({
  userId,
  provider
}) {
  const result = await pool.query(
    `
      UPDATE oauth_grants
      SET
        revoked_at = current_timestamp,
        updated_at = current_timestamp
      WHERE user_id = $1
        AND provider = $2
        AND revoked_at IS NULL
      RETURNING
        id,
        user_id,
        provider,
        provider_user_id,
        scopes,
        created_at,
        updated_at,
        revoked_at
    `,
    [userId, provider]
  );

  return result.rows[0] || null;
}