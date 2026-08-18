import pool from "../db/pool.js";
import { evaluateToolPolicy } from "./policy.js";
import { getAgentTool } from "./registry.js";
import { validateToolArguments } from "./validation.js";

async function recordToolCall({
  workspaceId,
  userId,
  tool,
  authorizationResult,
  status,
  resourceId = null,
  metadata = {}
}) {
  await pool.query(
    `
      INSERT INTO agent_tool_calls (
        workspace_id,
        user_id,
        tool_name,
        action,
        resource_type,
        resource_id,
        authorization_result,
        status,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
    `,
    [
      workspaceId,
      userId,
      tool.name,
      tool.action,
      tool.resourceType,
      resourceId,
      authorizationResult,
      status,
      JSON.stringify(metadata)
    ]
  );
}

export async function executeAgentTool({
  workspaceId,
  userId,
  role,
  toolName,
  arguments: toolArguments = {}
}) {
  const tool = getAgentTool(toolName);

  if (!tool) {
    return {
      ok: false,
      statusCode: 400,
      error: "Unknown agent tool"
    };
  }

  const policyDecision = evaluateToolPolicy({
    role,
    tool
  });

  if (!policyDecision.allowed) {
    await recordToolCall({
      workspaceId,
      userId,
      tool,
      authorizationResult: "DENIED",
      status: "DENIED",
      metadata: {
        role,
        reason: policyDecision.reason
      }
    });

    return {
      ok: false,
      statusCode: 403,
      error: "Agent tool permission denied"
    };
  }

  const validation = validateToolArguments(
    toolName,
    toolArguments
  );

  if (!validation.valid) {
    await recordToolCall({
      workspaceId,
      userId,
      tool,
      authorizationResult: "ALLOWED",
      status: "INVALID_ARGUMENTS",
      metadata: {
        role,
        error: validation.error
      }
    });

    return {
      ok: false,
      statusCode: 400,
      error: validation.error
    };
  }

  try {
    const result = await tool.execute({
      workspaceId,
      userId,
      ...validation.arguments
    });

    await recordToolCall({
      workspaceId,
      userId,
      tool,
      authorizationResult: "ALLOWED",
      status: "SUCCESS",
      resourceId:
        result?.task?.id ||
        result?.project?.id ||
        validation.arguments?.taskId ||
        validation.arguments?.projectId ||
        null,
      metadata: {
        role
      }
    });

    return {
      ok: true,
      result
    };
  } catch (error) {
    if (error.code === "RESOURCE_NOT_FOUND"  ||
  error.code === "ASSIGNEE_OUTSIDE_WORKSPACE") {
      await recordToolCall({
        workspaceId,
        userId,
        tool,
        authorizationResult: "ALLOWED",
        status: "DENIED",
        resourceId:
          validation.arguments?.taskId ||
          validation.arguments?.projectId ||
          null,
        metadata: {
          role,
          error: error.message,
          reason:
          error.code === "ASSIGNEE_OUTSIDE_WORKSPACE"
              ? "ASSIGNEE_OUTSIDE_WORKSPACE"
              : "RESOURCE_OUTSIDE_WORKSPACE_OR_NOT_FOUND"
        }
      });

      return {
  ok: false,
  statusCode: error.code === "ASSIGNEE_OUTSIDE_WORKSPACE"
    ? 403
    : 404,
  error:
    error.code === "ASSIGNEE_OUTSIDE_WORKSPACE"
      ? "Assigned user is not a member of this workspace"
      : "Resource not found"
};
    }

    await recordToolCall({
      workspaceId,
      userId,
      tool,
      authorizationResult: "ALLOWED",
      status: "ERROR",
      resourceId:
        validation.arguments?.taskId ||
        validation.arguments?.projectId ||
        null,
      metadata: {
        role,
        error: error.message
      }
    });

    throw error;
  }
}

