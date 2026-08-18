import pool from "../../db/pool.js";
import { requireProjectInWorkspace } from "../resources/projects.js";

export async function deleteProject({
  workspaceId,
  projectId
}) {
  await requireProjectInWorkspace({
    workspaceId,
    projectId
  });

  const result = await pool.query(
    `
      DELETE FROM projects
      WHERE id = $1
        AND workspace_id = $2
      RETURNING
        id,
        workspace_id
    `,
    [
      projectId,
      workspaceId
    ]
  );

  if (result.rowCount === 0) {
    const error = new Error("Project not found in workspace");
    error.code = "RESOURCE_NOT_FOUND";
    throw error;
  }

  return {
    project: result.rows[0]
  };
}
