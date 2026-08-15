import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember,
  requireRole
} from "../authorization/middleware.js";

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
  requireRole("OWNER", "ADMIN"),
  async (req, res) => {
    res.status(200).json({
      status: "authorized",
      role: req.workspace.role
    });
  }
);

export default router;