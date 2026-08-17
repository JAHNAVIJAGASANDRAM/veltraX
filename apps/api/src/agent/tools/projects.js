import pool from "../../db/pool.js";
import { requireProjectInWorkspace } from "../resources/projects.js";

export async function listProjects({ workspaceId }) {
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
      WHERE workspace_id = $1
      ORDER BY created_at ASC
    `,
    [workspaceId]
  );

  return {
    projects: result.rows
  };
}

export async function createProject({
  workspaceId,
  userId,
  name,
  description = null
}) {
  const normalizedName =
    typeof name === "string" ? name.trim() : "";

  if (!normalizedName) {
    throw new Error("Project name is required");
  }

  const normalizedDescription =
    typeof description === "string"
      ? description.trim() || null
      : null;

  const result = await pool.query(
    `
      INSERT INTO projects (
        workspace_id,
        name,
        description
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        workspace_id,
        name,
        description,
        created_at,
        updated_at
    `,
    [
      workspaceId,
      normalizedName,
      normalizedDescription
    ]
  );

  return {
    project: result.rows[0]
  };
}

export async function updateProject({
  workspaceId,
  projectId,
  name,
  description = null
}) {
  await requireProjectInWorkspace({
    workspaceId,
    projectId
  });

  const result = await pool.query(
    `
      UPDATE projects
      SET
        name = $1,
        description = $2,
        updated_at = current_timestamp
      WHERE id = $3
        AND workspace_id = $4
      RETURNING
        id,
        workspace_id,
        name,
        description,
        created_at,
        updated_at
    `,
    [
      name,
      description,
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
