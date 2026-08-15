import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requirePermission
} from "../authorization/middleware.js";
import { PERMISSIONS } from "../authorization/permissions.js";
import pool from "../db/pool.js";

const router = express.Router();

const VALID_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE"
];

/*
 * POST /api/workspaces/:workspaceId/projects/:projectId/tasks
 *
 * Create a task inside an authorized project.
 */
router.post(
  "/:workspaceId/projects/:projectId/tasks",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_CREATE),
  async (req, res, next) => {
    const { projectId } = req.params;
    const { title, description, status, assigned_to } = req.body;

    if (typeof title !== "string") {
      return res.status(400).json({
        error: "title is required"
      });
    }

    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      return res.status(400).json({
        error: "task title cannot be empty"
      });
    }

    if (normalizedTitle.length > 255) {
      return res.status(400).json({
        error: "task title must be 255 characters or fewer"
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        error: "description must be a string"
      });
    }

    const normalizedStatus =
      status === undefined
        ? "TODO"
        : typeof status === "string"
          ? status.trim().toUpperCase()
          : null;

    if (!normalizedStatus || !VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        error: "status must be TODO, IN_PROGRESS, or DONE"
      });
    }

    if (
      assigned_to !== undefined &&
      assigned_to !== null &&
      typeof assigned_to !== "string"
    ) {
      return res.status(400).json({
        error: "assigned_to must be a user ID"
      });
    }

    try {
      const projectResult = await pool.query(
        `
          SELECT id
          FROM projects
          WHERE id = $1
            AND workspace_id = $2
        `,
        [projectId, req.workspace.id]
      );

      if (projectResult.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      if (assigned_to) {
        const memberResult = await pool.query(
          `
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = $1
              AND user_id = $2
          `,
          [req.workspace.id, assigned_to]
        );

        if (memberResult.rowCount === 0) {
          return res.status(403).json({
            error: "Assigned user is not a member of this workspace"
          });
        }
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
          normalizedTitle,
          description ?? null,
          normalizedStatus,
          assigned_to ?? null
        ]
      );

      return res.status(201).json({
        task: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/workspaces/:workspaceId/projects/:projectId/tasks
 *
 * List tasks belonging to an authorized project.
 */
router.get(
  "/:workspaceId/projects/:projectId/tasks",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_VIEW),
  async (req, res, next) => {
    const { projectId } = req.params;

    try {
      const projectResult = await pool.query(
        `
          SELECT id
          FROM projects
          WHERE id = $1
            AND workspace_id = $2
        `,
        [projectId, req.workspace.id]
      );

      if (projectResult.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

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

      return res.status(200).json({
        tasks: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
 *
 * Get one task.
 *
 * IMPORTANT:
 * task_id is always constrained through project_id,
 * and project_id is constrained through workspace_id.
 */
router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_VIEW),
  async (req, res, next) => {
    const { projectId, taskId } = req.params;

    try {
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
            t.updated_at
          FROM tasks t
          INNER JOIN projects p
            ON p.id = t.project_id
          WHERE t.id = $1
            AND t.project_id = $2
            AND p.workspace_id = $3
        `,
        [
          taskId,
          projectId,
          req.workspace.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      return res.status(200).json({
        task: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * PATCH /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
 *
 * Update task metadata.
 */
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_UPDATE),
  async (req, res, next) => {
    const { projectId, taskId } = req.params;
    const {
      title,
      description,
      status,
      assigned_to
    } = req.body;

    if (
      title === undefined &&
      description === undefined &&
      status === undefined &&
      assigned_to === undefined
    ) {
      return res.status(400).json({
        error:
          "title, description, status, or assigned_to is required"
      });
    }

    if (
      title !== undefined &&
      typeof title !== "string"
    ) {
      return res.status(400).json({
        error: "title must be a string"
      });
    }

    const normalizedTitle =
      title === undefined
        ? undefined
        : title.trim();

    if (normalizedTitle !== undefined && !normalizedTitle) {
      return res.status(400).json({
        error: "task title cannot be empty"
      });
    }

    if (
      normalizedTitle !== undefined &&
      normalizedTitle.length > 255
    ) {
      return res.status(400).json({
        error: "task title must be 255 characters or fewer"
      });
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        error: "description must be a string"
      });
    }

    const normalizedStatus =
      status === undefined
        ? undefined
        : typeof status === "string"
          ? status.trim().toUpperCase()
          : null;

    if (
      normalizedStatus !== undefined &&
      (!normalizedStatus ||
        !VALID_STATUSES.includes(normalizedStatus))
    ) {
      return res.status(400).json({
        error: "status must be TODO, IN_PROGRESS, or DONE"
      });
    }

    if (
      assigned_to !== undefined &&
      assigned_to !== null &&
      typeof assigned_to !== "string"
    ) {
      return res.status(400).json({
        error: "assigned_to must be a user ID"
      });
    }

    try {
      const projectResult = await pool.query(
        `
          SELECT id
          FROM projects
          WHERE id = $1
            AND workspace_id = $2
        `,
        [projectId, req.workspace.id]
      );

      if (projectResult.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      const existingTask = await pool.query(
        `
          SELECT id
          FROM tasks
          WHERE id = $1
            AND project_id = $2
        `,
        [taskId, projectId]
      );

      if (existingTask.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      if (assigned_to) {
        const memberResult = await pool.query(
          `
            SELECT user_id
            FROM workspace_members
            WHERE workspace_id = $1
              AND user_id = $2
          `,
          [req.workspace.id, assigned_to]
        );

        if (memberResult.rowCount === 0) {
          return res.status(403).json({
        error: "Assigned user is not a member of this workspace"
        });
        }
      }

      const result = await pool.query(
        `
          UPDATE tasks
          SET
            title = COALESCE($1, title),
            description = CASE
              WHEN $2::boolean THEN $3
              ELSE description
            END,
            status = COALESCE($4, status),
            assigned_to = CASE
              WHEN $5::boolean THEN $6
              ELSE assigned_to
            END,
            updated_at = current_timestamp
          WHERE id = $7
            AND project_id = $8
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
          normalizedTitle ?? null,
          description !== undefined,
          description ?? null,
          normalizedStatus ?? null,
          assigned_to !== undefined,
          assigned_to ?? null,
          taskId,
          projectId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      return res.status(200).json({
        task: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * DELETE /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId
 *
 * Delete a task.
 */
router.delete(
  "/:workspaceId/projects/:projectId/tasks/:taskId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_DELETE),
  async (req, res, next) => {
    const { projectId, taskId } = req.params;

    try {
      const result = await pool.query(
        `
          DELETE FROM tasks
          WHERE id = $1
            AND project_id = $2
            AND EXISTS (
              SELECT 1
              FROM projects p
              WHERE p.id = tasks.project_id
                AND p.workspace_id = $3
            )
          RETURNING id
        `,
        [
          taskId,
          projectId,
          req.workspace.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;