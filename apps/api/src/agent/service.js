import pool from "../db/pool.js";
import { ROLE_PERMISSIONS } from "../authorization/permissions.js";
import { getAgentTool } from "./registry.js";
import { validateToolArguments } from "./validation.js";

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

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

  const authorized = hasPermission(role, tool.permission);

  if (!authorized) {
    await recordToolCall({
      workspaceId,
      userId,
      tool,
      authorizationResult: "DENIED",
      status: "DENIED",
      metadata: {
        role
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
    validation.arguments?.projectId ||
    result?.project?.id ||
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
    if (error.code === "RESOURCE_NOT_FOUND") {
     await recordToolCall({
  workspaceId,
  userId,
  tool,
  authorizationResult: "ALLOWED",
  status: "DENIED",
  resourceId: validation.arguments?.projectId || null,
  metadata: {
    role,
    error: error.message,
    reason: "RESOURCE_OUTSIDE_WORKSPACE_OR_NOT_FOUND"
  }
});

      return {
        ok: false,
        statusCode: 404,
        error: "Resource not found"
      };
    }

    await recordToolCall({
  workspaceId,
  userId,
  tool,
  authorizationResult: "ALLOWED",
  status: "ERROR",
  resourceId: validation.arguments?.projectId || null,
  metadata: {
    role,
    error: error.message
  }
});
    throw error;
  }
}

