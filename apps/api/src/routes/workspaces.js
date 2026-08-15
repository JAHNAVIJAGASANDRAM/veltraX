import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requirePermission
} from "../authorization/middleware.js";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ASSIGNABLE_ROLES,
  ROLE_CHANGE_RULES,
  ROLE_REMOVAL_RULES
} from "../authorization/permissions.js";
import pool from "../db/pool.js";

const router = express.Router();

/*
 * POST /api/workspaces
 *
 * Create a workspace for the authenticated user.
 * The creator automatically becomes OWNER.
 */
router.post("/", requireAuth, async (req, res, next) => {
  const { name } = req.body;

  if (typeof name !== "string") {
    return res.status(400).json({
      error: "name is required"
    });
  }

  const normalizedName = name.trim();

  if (!normalizedName) {
    return res.status(400).json({
      error: "workspace name cannot be empty"
    });
  }

  if (normalizedName.length > 255) {
    return res.status(400).json({
      error: "workspace name must be 255 characters or fewer"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const workspaceResult = await client.query(
      `
        INSERT INTO workspaces (name)
        VALUES ($1)
        RETURNING id, name, created_at, updated_at
      `,
      [normalizedName]
    );

    const workspace = workspaceResult.rows[0];

    await client.query(
      `
        INSERT INTO workspace_members (
          workspace_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'OWNER')
      `,
      [workspace.id, req.user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      workspace,
      role: "OWNER"
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

/*
 * GET /api/workspaces
 *
 * Return only workspaces where the authenticated user
 * has an active membership.
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          w.id,
          w.name,
          w.created_at,
          w.updated_at,
          wm.role
        FROM workspaces w
        INNER JOIN workspace_members wm
          ON wm.workspace_id = w.id
        WHERE wm.user_id = $1
        ORDER BY w.created_at ASC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      workspaces: result.rows
    });
  } catch (error) {
    next(error);
  }
});

/*
 * GET /api/workspaces/:workspaceId
 *
 * Return a specific workspace only if the authenticated
 * user is a member.
 */
router.get(
  "/:workspaceId",
  requireAuth,
  requireWorkspaceMember,
  async (req, res) => {
    res.status(200).json({
      workspace: req.workspace,
      user: req.user
    });
  }
);

/*
 * PATCH /api/workspaces/:workspaceId
 *
 * Update workspace metadata.
 * Currently only the workspace name is mutable.
 */
router.patch(
  "/:workspaceId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.WORKSPACE_UPDATE),
  async (req, res, next) => {
    const { name } = req.body;

    if (typeof name !== "string") {
      return res.status(400).json({
        error: "name is required"
      });
    }

    const normalizedName = name.trim();

    if (!normalizedName) {
      return res.status(400).json({
        error: "workspace name cannot be empty"
      });
    }

    if (normalizedName.length > 255) {
      return res.status(400).json({
        error: "workspace name must be 255 characters or fewer"
      });
    }

    try {
      const result = await pool.query(
        `
          UPDATE workspaces
          SET
            name = $1,
            updated_at = current_timestamp
          WHERE id = $2
          RETURNING id, name, created_at, updated_at
        `,
        [normalizedName, req.workspace.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "Workspace not found"
        });
      }

      return res.status(200).json({
        workspace: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/workspaces/:workspaceId/members
 *
 * List workspace members.
 */
router.get(
  "/:workspaceId/members",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.MEMBER_VIEW),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `
          SELECT
            u.id,
            u.email,
            wm.role,
            wm.created_at
          FROM workspace_members wm
          INNER JOIN users u
            ON u.id = wm.user_id
          WHERE wm.workspace_id = $1
          ORDER BY wm.created_at ASC
        `,
        [req.workspace.id]
      );

      return res.status(200).json({
        members: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * POST /api/workspaces/:workspaceId/members
 *
 * Add an existing user to the workspace.
 */
router.post(
  "/:workspaceId/members",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.MEMBER_INVITE),
  async (req, res, next) => {
    const { email, role } = req.body;

    if (
      typeof email !== "string" ||
      typeof role !== "string"
    ) {
      return res.status(400).json({
        error: "email and role are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = role.trim().toUpperCase();

    if (!normalizedEmail || !normalizedRole) {
      return res.status(400).json({
        error: "email and role cannot be empty"
      });
    }

    try {
      const allowedRoles =
        ASSIGNABLE_ROLES[req.workspace.role] || [];

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(403).json({
          error: "You cannot assign this role"
        });
      }

      const userResult = await pool.query(
        `
          SELECT id, email
          FROM users
          WHERE email = $1
        `,
        [normalizedEmail]
      );

      if (userResult.rowCount === 0) {
        return res.status(404).json({
          error: "User not found"
        });
      }

      const user = userResult.rows[0];

      const existingMembership = await pool.query(
        `
          SELECT id
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
        `,
        [req.workspace.id, user.id]
      );

      if (existingMembership.rowCount > 0) {
        return res.status(409).json({
          error: "User is already a workspace member"
        });
      }

      const membershipResult = await pool.query(
        `
          INSERT INTO workspace_members (
            workspace_id,
            user_id,
            role
          )
          VALUES ($1, $2, $3)
          RETURNING workspace_id, user_id, role, created_at
        `,
        [req.workspace.id, user.id, normalizedRole]
      );

      return res.status(201).json({
        member: membershipResult.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * PATCH /api/workspaces/:workspaceId/members/:userId/role
 *
 * Change an existing member's role.
 */
router.patch(
  "/:workspaceId/members/:userId/role",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.MEMBER_ROLE_UPDATE),
  async (req, res, next) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (typeof role !== "string") {
      return res.status(400).json({
        error: "role is required"
      });
    }

    const normalizedRole = role.trim().toUpperCase();

    try {
      if (!ROLE_PERMISSIONS[normalizedRole]) {
        return res.status(400).json({
          error: "Invalid workspace role"
        });
      }

      if (userId === req.user.id) {
        return res.status(400).json({
          error: "You cannot change your own workspace role"
        });
      }

      const allowedRoles =
        ROLE_CHANGE_RULES[req.workspace.role] || [];

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(403).json({
          error: "You cannot assign this role"
        });
      }

      const targetResult = await pool.query(
        `
          SELECT user_id, role
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
        `,
        [req.workspace.id, userId]
      );

      if (targetResult.rowCount === 0) {
        return res.status(404).json({
          error: "Workspace member not found"
        });
      }

      const target = targetResult.rows[0];

      if (target.role === "OWNER") {
        return res.status(403).json({
          error: "The workspace owner cannot be modified"
        });
      }

      const result = await pool.query(
        `
          UPDATE workspace_members
          SET role = $1
          WHERE workspace_id = $2
            AND user_id = $3
          RETURNING workspace_id, user_id, role, created_at
        `,
        [normalizedRole, req.workspace.id, userId]
      );

      return res.status(200).json({
        member: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * DELETE /api/workspaces/:workspaceId/members/:userId
 *
 * Remove a member from the workspace.
 */
router.delete(
  "/:workspaceId/members/:userId",
  requireAuth,
  requireWorkspaceMember,
  requirePermission(PERMISSIONS.MEMBER_REMOVE),
  async (req, res, next) => {
    const { userId } = req.params;

    try {
      if (userId === req.user.id) {
        return res.status(400).json({
          error: "You cannot remove yourself from the workspace"
        });
      }

      const targetResult = await pool.query(
        `
          SELECT user_id, role
          FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
        `,
        [req.workspace.id, userId]
      );

      if (targetResult.rowCount === 0) {
        return res.status(404).json({
          error: "Workspace member not found"
        });
      }

      const target = targetResult.rows[0];

      if (target.role === "OWNER") {
        return res.status(403).json({
          error: "The workspace owner cannot be removed"
        });
      }

      const removableRoles =
        ROLE_REMOVAL_RULES[req.workspace.role] || [];

      if (!removableRoles.includes(target.role)) {
        return res.status(403).json({
          error: "You cannot remove this member"
        });
      }

      await pool.query(
        `
          DELETE FROM workspace_members
          WHERE workspace_id = $1
            AND user_id = $2
        `,
        [req.workspace.id, userId]
      );

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;