import test from "node:test";
import assert from "node:assert/strict";

import { getLLMConfig, requestChatCompletion } from "../src/agent/provider.js";

const configuredEnv = {
  LLM_API_KEY: "test-key",
  LLM_MODEL: "test-model",
  LLM_API_URL: "https://llm.example.test/v1/chat/completions",
  LLM_TIMEOUT_MS: "3000"
};

test("LLM configuration is read from environment and never requires a key in source", () => {
  assert.deepEqual(getLLMConfig(configuredEnv), {
    apiKey: "test-key",
    model: "test-model",
    apiUrl: "https://llm.example.test/v1/chat/completions",
    timeoutMs: 3000
  });
});

test("missing API key fails closed with a configuration error", async () => {
  await assert.rejects(
    requestChatCompletion({ messages: [], tools: [], env: {} }),
    (error) => error.code === "LLM_NOT_CONFIGURED" && error.statusCode === 503
  );
});

test("provider sends structured tool definitions and returns a valid tool call", async () => {
  let request;
  const result = await requestChatCompletion({
    messages: [{ role: "user", content: "List projects" }],
    tools: [{ type: "function", function: { name: "list_projects", parameters: { type: "object" } } }],
    env: configuredEnv,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: "call_1",
                type: "function",
                function: { name: "list_projects", arguments: "{}" }
              }]
            }
          }]
        })
      };
    }
  });

  assert.equal(request.url, configuredEnv.LLM_API_URL);
  assert.equal(request.options.headers.authorization, "Bearer test-key");
  assert.equal(request.body.model, "test-model");
  assert.equal(request.body.tools[0].function.name, "list_projects");
  assert.equal(result.tool_calls[0].function.name, "list_projects");
});

test("provider rate limits return a safe, typed error", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: false, status: 429 })
    }),
    (error) => error.code === "LLM_RATE_LIMITED" && error.statusCode === 429
  );
});

test("malformed provider payload is rejected", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [] }) })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE"
  );
});

test("network failure is mapped to a safe provider error", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => { throw new Error("private network detail"); }
    }),
    (error) => error.code === "LLM_UNAVAILABLE" && !error.message.includes("private network detail")
  );
});


test("provider rejects malformed tool-call structures", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                type: "function",
                function: { name: "list_projects", arguments: "{}" }
              }]
            }
          }]
        })
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE"
  );
});

test("provider maps a timeout to a safe timeout error", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }
    }),
    (error) => error.code === "LLM_TIMEOUT" && error.statusCode === 504
  );
});

test("valid completion without tool calls returns message content", async () => {
  const result = await requestChatCompletion({
    messages: [{ role: "user", content: "Hello" }],
    tools: [],
    env: configuredEnv,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{
          message: {
            content: "Hello! How can I help you?",
            tool_calls: []
          },
          finish_reason: "stop"
        }]
      })
    })
  });

  assert.equal(result.content, "Hello! How can I help you?");
});

test("invalid JSON response throws LLM_MALFORMED_RESPONSE", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => { throw new SyntaxError("Unexpected token < in JSON at position 0"); }
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE" && error.statusCode === 502
  );
});

test("HTTP 401/403 credentials rejected returns LLM_CONFIGURATION_ERROR", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: false, status: 401 })
    }),
    (error) => error.code === "LLM_CONFIGURATION_ERROR" && error.statusCode === 503
  );

  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: false, status: 403 })
    }),
    (error) => error.code === "LLM_CONFIGURATION_ERROR" && error.statusCode === 503
  );
});

test("HTTP 5xx server error returns LLM_UNAVAILABLE", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: false, status: 500 })
    }),
    (error) => error.code === "LLM_UNAVAILABLE" && error.statusCode === 502
  );

  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({ ok: false, status: 503 })
    }),
    (error) => error.code === "LLM_UNAVAILABLE" && error.statusCode === 502
  );
});

test("empty completion is rejected", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: "",
              tool_calls: []
            }
          }]
        })
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE" && error.statusCode === 502
  );
});

test("oversized completion content is rejected", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: "A".repeat(50001)
            }
          }]
        })
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE" && error.statusCode === 502
  );
});

test("oversized tool-call arguments are rejected", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: null,
              tool_calls: [{
                id: "call_oversized",
                type: "function",
                function: {
                  name: "create_task",
                  arguments: JSON.stringify({ description: "B".repeat(20005) })
                }
              }]
            }
          }]
        })
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE" && error.statusCode === 502
  );
});

test("finish_reason length is rejected as truncated response", async () => {
  await assert.rejects(
    requestChatCompletion({
      messages: [],
      tools: [],
      env: configuredEnv,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{
            message: {
              content: "truncated response...",
              tool_calls: []
            },
            finish_reason: "length"
          }]
        })
      })
    }),
    (error) => error.code === "LLM_MALFORMED_RESPONSE" && error.message.includes("truncated")
  );
});

test("invalid API URL protocol in configuration fails closed", () => {
  assert.throws(
    () => getLLMConfig({ ...configuredEnv, LLM_API_URL: "ftp://example.test/v1" }),
    (error) => error.code === "LLM_CONFIGURATION_ERROR" && error.statusCode === 503
  );

  assert.throws(
    () => getLLMConfig({ ...configuredEnv, LLM_API_URL: "not-a-url" }),
    (error) => error.code === "LLM_CONFIGURATION_ERROR" && error.statusCode === 503
  );
});

