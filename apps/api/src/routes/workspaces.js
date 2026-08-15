import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  requireWorkspaceMember
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

export default router;