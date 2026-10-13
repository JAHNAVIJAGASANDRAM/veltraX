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
