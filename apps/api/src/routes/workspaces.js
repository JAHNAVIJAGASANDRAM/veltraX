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
  ROLE_CHANGE_RULES
} from "../authorization/permissions.js";
import pool from "../db/pool.js";

const router = express.Router();

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

router.post(
  "/:workspaceId/admin-test",
  requireAuth,
  requireWorkspaceMember,
 requirePermission(PERMISSIONS.WORKSPACE_UPDATE),
  async (req, res) => {
    res.status(200).json({
      status: "authorized",
      role: req.workspace.role
    });
  }
);
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
export default router;