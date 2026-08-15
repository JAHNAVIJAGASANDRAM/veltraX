import pool from "../db/pool.js";

export async function logActivity({
  workspaceId,
  userId,
  action,
  resourceType,
  resourceId,
  metadata = {}
}) {
  await pool.query(
    `
      INSERT INTO activity (
        workspace_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `,
    [
      workspaceId,
      userId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(metadata)
    ]
  );
}