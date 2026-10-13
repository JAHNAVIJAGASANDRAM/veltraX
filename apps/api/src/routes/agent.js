import { randomUUID } from "node:crypto";
import express from "express";
import { requireAuth } from "../auth/middleware.js";
import { requireWorkspaceMember } from "../authorization/middleware.js";
import { executeAgentTool } from "../agent/service.js";
import { runAgentChat } from "../agent/chat.js";

const router = express.Router();

function getRequestId(req) {
  const candidate = req.get("x-request-id");
  return typeof candidate === "string" &&
    candidate.length <= 128 &&
    /^[a-zA-Z0-9._:-]+$/.test(candidate)
    ? candidate
    : randomUUID();
}

function getAuthorizationContext(req) {
  return {
    workspaceId: req.workspace.id,
    userId: req.user.id,
    role: req.workspace.role
  };
}

router.post(
  "/:workspaceId/agent/tool",
  requireAuth,
  requireWorkspaceMember,
  async (req, res, next) => {
    const { tool, arguments: toolArguments } = req.body || {};
    const requestId = getRequestId(req);
    res.set("x-request-id", requestId);

    if (typeof tool !== "string" || !tool.trim()) {
      return res.status(400).json({ error: "tool is required", requestId });
    }

    try {
      const result = await executeAgentTool({
        authorizationContext: getAuthorizationContext(req),
        toolName: tool.trim(),
        arguments: toolArguments,
        requestId
      });

      if (!result.ok) {
        return res.status(result.statusCode).json({
          error: result.error,
          requestId
        });
      }

      return res.status(200).json({
        tool: tool.trim(),
        result: result.result,
        requestId
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * POST /api/workspaces/:workspaceId/agent/chat
 *
 * Natural-language requests are planning input only. Every model-selected
 * tool is passed to executeAgentTool, which validates arguments and derives
 * capabilities from the authenticated workspace membership.
 */
router.post(
  "/:workspaceId/agent/chat",
  requireAuth,
  requireWorkspaceMember,
  async (req, res) => {
    const requestId = getRequestId(req);
    res.set("x-request-id", requestId);

    if (req.headers["content-type"] && !req.is("application/json")) {
      return res.status(415).json({
        error: "Content-Type must be application/json",
        requestId
      });
    }

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "Request body must be a JSON object",
        requestId
      });
    }

    const { message } = req.body;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "message is required",
        requestId
      });
    }
    if (message.length > 4000) {
      return res.status(400).json({
        error: "message must be 4000 characters or fewer",
        requestId
      });
    }

    try {
      const result = await runAgentChat({
        authorizationContext: getAuthorizationContext(req),
        userMessage: message,
        requestId
      });

      return res.status(200).json({ ...result, requestId });
    } catch (error) {
      const statusCode = [429, 503, 504].includes(error.statusCode)
        ? error.statusCode
        : 502;

      // Do not expose provider response bodies, request headers, or secrets.
      console.error("Agent chat failed", {
        requestId,
        code: typeof error.code === "string" ? error.code : "AGENT_CHAT_ERROR"
      });

      return res.status(statusCode).json({
        error: error.code === "LLM_NOT_CONFIGURED"
          ? "AI agent is not configured"
          : error.code === "LLM_CONFIGURATION_ERROR"
            ? "AI agent configuration error"
            : error.code === "LLM_RATE_LIMITED"
              ? "AI provider rate limit reached; retry later"
              : error.code === "LLM_TIMEOUT"
                ? "AI provider timed out"
                : "AI agent is temporarily unavailable",
        requestId
      });
    }
  }
);

export default router;
