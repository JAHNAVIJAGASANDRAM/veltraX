import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requirePermission
} from "../authorization/middleware.js";
import { PERMISSIONS } from "../authorization/permissions.js";
import pool from "../db/pool.js";

const router = express.Router();

/*
 * POST
 * /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments
 *
 * Create a comment on a task.
 */
router.post(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_CREATE),
  async (req, res, next) => {
    const {
      workspaceId,
      projectId,
      taskId
    } = req.params;

    const { body } = req.body;

    if (typeof body !== "string") {
      return res.status(400).json({
        error: "body is required"
      });
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      return res.status(400).json({
        error: "comment body cannot be empty"
      });
    }

    try {
      const taskResult = await pool.query(
        `
          SELECT t.id
          FROM tasks t
          INNER JOIN projects p
            ON p.id = t.project_id
          WHERE t.id = $1
            AND p.id = $2
            AND p.workspace_id = $3
        `,
        [taskId, projectId, workspaceId]
      );

      if (taskResult.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      const result = await pool.query(
        `
          INSERT INTO comments (
            task_id,
            user_id,
            body
          )
          VALUES ($1, $2, $3)
          RETURNING
            id,
            task_id,
            user_id,
            body,
            created_at,
            updated_at
        `,
        [
          taskId,
          req.user.id,
          normalizedBody
        ]
      );

      return res.status(201).json({
        comment: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET
 * /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments
 *
 * List comments belonging to the authorized task.
 */
router.get(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_VIEW),
  async (req, res, next) => {
    const {
      workspaceId,
      projectId,
      taskId
    } = req.params;

    try {
      const taskResult = await pool.query(
        `
          SELECT t.id
          FROM tasks t
          INNER JOIN projects p
            ON p.id = t.project_id
          WHERE t.id = $1
            AND p.id = $2
            AND p.workspace_id = $3
        `,
        [taskId, projectId, workspaceId]
      );

      if (taskResult.rowCount === 0) {
        return res.status(404).json({
          error: "Task not found"
        });
      }

      const result = await pool.query(
        `
          SELECT
            c.id,
            c.task_id,
            c.user_id,
            u.email AS user_email,
            c.body,
            c.created_at,
            c.updated_at
          FROM comments c
          INNER JOIN users u
            ON u.id = c.user_id
          WHERE c.task_id = $1
          ORDER BY c.created_at ASC
        `,
        [taskId]
      );

      return res.status(200).json({
        comments: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * PATCH
 * /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId
 *
 * Update a comment.
 */
router.patch(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_UPDATE),
  async (req, res, next) => {
    const {
      workspaceId,
      projectId,
      taskId,
      commentId
    } = req.params;

    const { body } = req.body;

    if (typeof body !== "string") {
      return res.status(400).json({
        error: "body is required"
      });
    }

    const normalizedBody = body.trim();

    if (!normalizedBody) {
      return res.status(400).json({
        error: "comment body cannot be empty"
      });
    }

    try {
      const result = await pool.query(
        `
          UPDATE comments c
          SET
            body = $1,
            updated_at = current_timestamp
          FROM tasks t
          INNER JOIN projects p
            ON p.id = t.project_id
          WHERE c.id = $2
            AND c.task_id = $3
            AND t.id = $3
            AND p.id = $4
            AND p.workspace_id = $5
          RETURNING
            c.id,
            c.task_id,
            c.user_id,
            c.body,
            c.created_at,
            c.updated_at
        `,
        [
          normalizedBody,
          commentId,
          taskId,
          projectId,
          workspaceId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Comment not found"
        });
      }

      return res.status(200).json({
        comment: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * DELETE
 * /api/workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId
 *
 * Delete a comment.
 */
router.delete(
  "/:workspaceId/projects/:projectId/tasks/:taskId/comments/:commentId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.TASK_DELETE),
  async (req, res, next) => {
    const {
      workspaceId,
      projectId,
      taskId,
      commentId
    } = req.params;

    try {
      const result = await pool.query(
        `
          DELETE FROM comments c
          USING tasks t, projects p
          WHERE c.id = $1
            AND c.task_id = $2
            AND t.id = $2
            AND t.project_id = p.id
            AND p.id = $3
            AND p.workspace_id = $4
          RETURNING c.id
        `,
        [
          commentId,
          taskId,
          projectId,
          workspaceId
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Comment not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;