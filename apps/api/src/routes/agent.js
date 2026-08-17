import express from "express";
import { requireAuth } from "../auth/middleware.js";
import { requireWorkspaceMember } from "../authorization/middleware.js";
import { executeAgentTool } from "../agent/service.js";

const router = express.Router();

/*
 * POST /api/workspaces/:workspaceId/agent/tool
 *
 * Execute one authorized agent tool.
 *
 * The authenticated session determines:
 * - user identity
 * - workspace
 * - workspace role
 *
 * The client/agent only supplies the tool name.
 */
router.post(
  "/:workspaceId/agent/tool",
  requireAuth,
  requireWorkspaceMember,
  async (req, res, next) => {
    const { tool, arguments: toolArguments } = req.body;

    if (typeof tool !== "string" || !tool.trim()) {
      return res.status(400).json({
        error: "tool is required"
      });
    }

    try {
      const result = await executeAgentTool({
        workspaceId: req.workspace.id,
        userId: req.user.id,
        role: req.workspace.role,
        toolName: tool.trim(),
        arguments: toolArguments
      });

      if (!result.ok) {
        return res.status(result.statusCode).json({
          error: result.error
        });
      }

      return res.status(200).json({
        tool: tool.trim(),
        result: result.result
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;