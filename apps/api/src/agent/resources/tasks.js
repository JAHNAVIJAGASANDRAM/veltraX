import pool from "../../db/pool.js";

export async function requireTaskInWorkspace({
  workspaceId,
  taskId
}) {
  const result = await pool.query(
    `
      SELECT
        t.id,
        t.project_id,
        t.title,
        t.description,
        t.status,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        p.workspace_id
      FROM tasks t
      INNER JOIN projects p
        ON p.id = t.project_id
      WHERE t.id = $1
        AND p.workspace_id = $2
    `,
    [taskId, workspaceId]
  );

  if (result.rowCount === 0) {
    const error = new Error("Task not found in workspace");
    error.code = "RESOURCE_NOT_FOUND";
    throw error;
  }

  return result.rows[0];
}

export async function requireProjectForTask({
  workspaceId,
  projectId
}) {
  const result = await pool.query(
    `
      SELECT
        id,
        workspace_id,
        name
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

export async function requireWorkspaceMemberForAssignment({
  workspaceId,
  userId
}) {
  const result = await pool.query(
    `
      SELECT
        user_id,
        role
      FROM workspace_members
      WHERE workspace_id = $1
        AND user_id = $2
    `,
    [workspaceId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error(
      "Assigned user is not a member of this workspace"
    );
    error.code = "ASSIGNEE_OUTSIDE_WORKSPACE";
    throw error;
  }

  return result.rows[0];
}
