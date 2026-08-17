import pool from "../../db/pool.js";

export async function requireProjectInWorkspace({
  workspaceId,
  projectId
}) {
  const result = await pool.query(
    `
      SELECT
        id,
        workspace_id,
        name,
        description,
        created_at,
        updated_at
      FROM projects
      WHERE id = $1
        AND workspace_id = $2
    `,
    [projectId, workspaceId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Project not found in workspace");
    error.code = "RESOURCE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}
