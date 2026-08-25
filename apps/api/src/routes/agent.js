import express from "express";
import { requireAuth } from "../auth/middleware.js";
import { requireWorkspaceMember } from "../authorization/middleware.js";
import { getAgentCapabilities } from "../agent/capabilities.js";
import { executeAgentTool } from "../agent/service.js";

const router = express.Router();

/*
 * POST /api/workspaces/:workspaceId/agent/tool
 *
 * Execute one authorized agent tool.
 *
 * Authorization flow:
 * - authenticated session determines user identity
 * - workspace membership determines workspace role
 * - server derives agent capabilities from that role
 * - capability policy authorizes the requested tool
 *
 * The client/agent never supplies capabilities or role.
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
      const capabilities = getAgentCapabilities(req.workspace.role);

      const result = await executeAgentTool({
        workspaceId: req.workspace.id,
        userId: req.user.id,
        role: req.workspace.role,
        capabilities,
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
