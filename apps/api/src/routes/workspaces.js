import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requirePermission
} from "../authorization/middleware.js";

import { PERMISSIONS } from "../authorization/permissions.js";
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

export default router;