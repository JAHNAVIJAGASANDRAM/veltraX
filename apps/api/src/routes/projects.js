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
 * POST /api/workspaces/:workspaceId/projects
 *
 * Create a project inside the authenticated user's workspace.
 */
router.post(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.PROJECT_CREATE),
  async (req, res, next) => {
    const { name, description } = req.body;

    if (typeof name !== "string") {
      return res.status(400).json({
        error: "name is required"
      });
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      return res.status(400).json({
        error: "project name cannot be empty"
      });
    }

    if (normalizedName.length > 255) {
      return res.status(400).json({
        error: "project name must be 255 characters or fewer"
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

    try {
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
          req.workspace.id,
          normalizedName,
          description ?? null
        ]
      );

      return res.status(201).json({
        project: result.rows[0]
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "A project with that name already exists in this workspace"
        });
      }

      next(error);
    }
  }
);

/*
 * GET /api/workspaces/:workspaceId/projects
 *
 * List projects belonging only to the authorized workspace.
 */
router.get(
  "/:workspaceId/projects",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  async (req, res, next) => {
    try {
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
        [req.workspace.id]
      );

      return res.status(200).json({
        projects: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/workspaces/:workspaceId/projects/:projectId
 *
 * Get one project.
 *
 * IMPORTANT:
 * project_id is always constrained by workspace_id.
 */
router.get(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.PROJECT_VIEW),
  async (req, res, next) => {
    const { projectId } = req.params;

    try {
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
        [projectId, req.workspace.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      return res.status(200).json({
        project: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * PATCH /api/workspaces/:workspaceId/projects/:projectId
 *
 * Update project metadata.
 */
router.patch(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.PROJECT_UPDATE),
  async (req, res, next) => {
    const { projectId } = req.params;
    const { name, description } = req.body;

    if (name === undefined && description === undefined) {
      return res.status(400).json({
        error: "name or description is required"
      });
    }

    if (
      name !== undefined &&
      typeof name !== "string"
    ) {
      return res.status(400).json({
        error: "name must be a string"
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

    const normalizedName =
      name === undefined ? undefined : name.trim();

    if (normalizedName !== undefined && !normalizedName) {
      return res.status(400).json({
        error: "project name cannot be empty"
      });
    }

    if (
      normalizedName !== undefined &&
      normalizedName.length > 255
    ) {
      return res.status(400).json({
        error: "project name must be 255 characters or fewer"
      });
    }

    try {
      const result = await pool.query(
        `
          UPDATE projects
          SET
            name = COALESCE($1, name),
            description = CASE
              WHEN $2::boolean THEN $3
              ELSE description
            END,
            updated_at = current_timestamp
          WHERE id = $4
            AND workspace_id = $5
          RETURNING
            id,
            workspace_id,
            name,
            description,
            created_at,
            updated_at
        `,
        [
          normalizedName ?? null,
          description !== undefined,
          description ?? null,
          projectId,
          req.workspace.id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      return res.status(200).json({
        project: result.rows[0]
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "A project with that name already exists in this workspace"
        });
      }

      next(error);
    }
  }
);

/*
 * DELETE /api/workspaces/:workspaceId/projects/:projectId
 *
 * Delete a project.
 */
router.delete(
  "/:workspaceId/projects/:projectId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.PROJECT_DELETE),
  async (req, res, next) => {
    const { projectId } = req.params;

    try {
      const result = await pool.query(
        `
          DELETE FROM projects
          WHERE id = $1
            AND workspace_id = $2
          RETURNING id
        `,
        [projectId, req.workspace.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Project not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;