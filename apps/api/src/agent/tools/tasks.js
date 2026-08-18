import pool from "../../db/pool.js";
import {
  requireTaskInWorkspace,
  requireProjectForTask,
  requireWorkspaceMemberForAssignment
} from "../resources/tasks.js";

const VALID_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE"
];

export async function listTasks({
  workspaceId,
  projectId
}) {
  await requireProjectForTask({
    workspaceId,
    projectId
  });

  const result = await pool.query(
    `
      SELECT
        id,
        project_id,
        title,
        description,
        status,
        assigned_to,
        created_at,
        updated_at
      FROM tasks
      WHERE project_id = $1
      ORDER BY created_at ASC
    `,
    [projectId]
  );

  return {
    tasks: result.rows
  };
}

export async function createTask({
  workspaceId,
  projectId,
  title,
  description = null,
  status = "TODO",
  assignedTo = null
}) {
  await requireProjectForTask({
    workspaceId,
    projectId
  });

  if (assignedTo) {
    await requireWorkspaceMemberForAssignment({
      workspaceId,
      userId: assignedTo
    });
  }

  const result = await pool.query(
    `
      INSERT INTO tasks (
        project_id,
        title,
        description,
        status,
        assigned_to
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        project_id,
        title,
        description,
        status,
        assigned_to,
        created_at,
        updated_at
    `,
    [
      projectId,
      title,
      description,
      status,
      assignedTo
    ]
  );

  return {
    task: result.rows[0]
  };
}

export async function updateTask({
  workspaceId,
  taskId,
  title,
  description = null,
  status,
  assignedTo = null
}) {
  await requireTaskInWorkspace({
    workspaceId,
    taskId
  });

  if (assignedTo) {
    await requireWorkspaceMemberForAssignment({
      workspaceId,
      userId: assignedTo
    });
  }

  const result = await pool.query(
    `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        status = $3,
        assigned_to = $4,
        updated_at = current_timestamp
      WHERE id = $5
      RETURNING
        id,
        project_id,
        title,
        description,
        status,
        assigned_to,
        created_at,
        updated_at
    `,
    [
      title,
      description,
      status,
      assignedTo,
      taskId
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

