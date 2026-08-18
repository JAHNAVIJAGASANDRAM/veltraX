import pool from "../../db/pool.js";
import { requireTaskInWorkspace } from "../resources/tasks.js";

export async function deleteTask({
  workspaceId,
  taskId
}) {
  await requireTaskInWorkspace({
    workspaceId,
    taskId
  });

  const result = await pool.query(
    `
      DELETE FROM tasks
      WHERE id = $1
        AND EXISTS (
          SELECT 1
          FROM projects p
          WHERE p.id = tasks.project_id
            AND p.workspace_id = $2
        )
      RETURNING
        id,
        project_id
    `,
    [
      taskId,
      workspaceId
    ]
  );

  if (result.rowCount === 0) {
    const error = new Error("Task not found in workspace");
    error.code = "RESOURCE_NOT_FOUND";
    throw error;
  }

  return {
    task: result.rows[0]
  };
}
