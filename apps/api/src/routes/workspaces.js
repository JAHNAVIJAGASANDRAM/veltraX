import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requirePermission
} from "../authorization/middleware.js";

import { PERMISSIONS } from "../authorization/permissions.js";

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

export default router;