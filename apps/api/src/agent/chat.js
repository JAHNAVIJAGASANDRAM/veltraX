import { AGENT_TOOLS } from "./registry.js";
import { executeAgentTool } from "./service.js";
import { buildAgentMessages } from "./prompts.js";
import { requestChatCompletion } from "./provider.js";

const MAX_TOOL_ROUNDS = 4;
const MAX_TOOL_CALLS = 6;

const TOOL_SCHEMAS = Object.freeze({
  list_projects: {
    type: "function",
    function: {
      name: "list_projects",
      description: "List projects in the authenticated workspace.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    }
  },
  list_tasks: {
    type: "function",
    function: {
      name: "list_tasks",
      description: "List tasks in a project in the authenticated workspace.",
      parameters: {
        type: "object",
        properties: { project_id: { type: "string", format: "uuid" } },
        required: ["project_id"],
        additionalProperties: false
      }
    }
  },
  create_project: {
    type: "function",
    function: {
      name: "create_project",
      description: "Create a project in the authenticated workspace.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"], maxLength: 5000 }
        },
        required: ["name"],
        additionalProperties: false
      }
    }
  },
  update_project: {
    type: "function",
    function: {
      name: "update_project",
      description: "Update a project in the authenticated workspace.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", format: "uuid" },
          name: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"], maxLength: 5000 }
        },
        required: ["project_id", "name"],
        additionalProperties: false
      }
    }
  },
  create_task: {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task in a project in the authenticated workspace.",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"], maxLength: 5000 },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
          assigned_to: { type: ["string", "null"], format: "uuid" }
        },
        required: ["project_id", "title"],
        additionalProperties: false
      }
    }
  },
  update_task: {
    type: "function",
    function: {
      name: "update_task",
      description: "Update a task in the authenticated workspace.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", format: "uuid" },
          title: { type: "string", minLength: 1, maxLength: 255 },
          description: { type: ["string", "null"], maxLength: 5000 },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE"] },
          assigned_to: { type: ["string", "null"], format: "uuid" }
        },
        required: ["task_id", "title", "status"],
        additionalProperties: false
      }
    }
  },
  github_get_user: {
    type: "function",
    function: {
      name: "github_get_user",
      description: "Get the GitHub identity connected to the authenticated Veltra user.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    }
  },
  github_list_repositories: {
    type: "function",
    function: {
      name: "github_list_repositories",
      description: "List repositories accessible through the authenticated user's GitHub grant.",
      parameters: { type: "object", properties: {}, required: [], additionalProperties: false }
    }
  },
  github_get_repository: {
    type: "function",
    function: {
      name: "github_get_repository",
      description: "Get metadata for a repository accessible through the authenticated user's GitHub grant.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", minLength: 1, maxLength: 100 },
          repo: { type: "string", minLength: 1, maxLength: 100 }
        },
        required: ["owner", "repo"],
        additionalProperties: false
      }
    }
  }
});

export const AGENT_LLM_TOOLS = Object.freeze(
  Object.entries(TOOL_SCHEMAS)
    .filter(([name]) => Boolean(AGENT_TOOLS[name]))
    .map(([, schema]) => schema)
);

function parseArguments(rawArguments) {
  if (typeof rawArguments !== "string" || rawArguments.length > 10000) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawArguments);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function runAgentChat({
  authorizationContext,
  userMessage,
  requestId,
  completion = requestChatCompletion,
  executeTool = executeAgentTool
}) {
  const messages = buildAgentMessages({ userMessage });
  const toolResults = [];
  let totalCalls = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const assistantMessage = await completion({
      messages,
      tools: AGENT_LLM_TOOLS
    });

    const calls = assistantMessage.tool_calls || [];
    if (calls.length === 0) {
      return {
        message: assistantMessage.content || "I couldn't produce a response.",
        toolCalls: toolResults
      };
    }

    messages.push({
      role: "assistant",
      content: assistantMessage.content || null,
      tool_calls: calls
    });

    for (const call of calls) {
      totalCalls += 1;
      if (totalCalls > MAX_TOOL_CALLS) {
        return {
          message: "I stopped because the request required too many tool operations. Please narrow the request.",
          toolCalls: toolResults,
          stopped: "TOOL_CALL_LIMIT"
        };
      }

      const toolName = call?.function?.name;
      const parsedArguments = parseArguments(call?.function?.arguments);
      let result;

      if (!toolName || !TOOL_SCHEMAS[toolName] || !parsedArguments) {
        result = {
          ok: false,
          error: "Invalid or unsupported tool request"
        };
      } else {
        const execution = await executeTool({
          authorizationContext,
          toolName,
          arguments: parsedArguments,
          requestId
        });
        result = execution.ok
          ? { ok: true, result: execution.result }
          : { ok: false, error: execution.error };
      }

      toolResults.push({
        tool: typeof toolName === "string" ? toolName : "unknown",
        ok: result.ok,
        ...(result.ok ? { result: result.result } : { error: result.error })
      });

      messages.push({
        role: "tool",
        tool_call_id: typeof call?.id === "string" ? call.id : `invalid-call-${totalCalls}`,
        content: JSON.stringify(result)
      });
    }
  }

  return {
    message: "I reached the tool-call limit before completing the request. Please narrow the request.",
    toolCalls: toolResults,
    stopped: "TOOL_ROUND_LIMIT"
  };
}
