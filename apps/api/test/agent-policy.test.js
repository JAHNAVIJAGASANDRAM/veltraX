import test from "node:test";
import assert from "node:assert/strict";

import { evaluateToolPolicy } from "../src/agent/policy.js";
import { getAgentTool } from "../src/agent/registry.js";
import { getAgentCapabilities } from "../src/agent/capabilities.js";

test("delete_task capability matrix", () => {
  const tool = getAgentTool("delete_task");

  assert.ok(tool);

  const expected = {
    OWNER: true,
    ADMIN: true,
    MANAGER: false,
    MEMBER: false,
    VIEWER: false
  };

  for (const [role, allowed] of Object.entries(expected)) {
    const capabilities = getAgentCapabilities(role);

    const decision = evaluateToolPolicy({
      capabilities,
      tool
    });

    assert.equal(
      decision.allowed,
      allowed,
      `${role} delete_task capability mismatch`
    );

    assert.equal(
      decision.reason,
      allowed
        ? "CAPABILITY_GRANTED"
        : "CAPABILITY_DENIED"
    );
  }
});

test("delete_project capability matrix", () => {
  const tool = getAgentTool("delete_project");

  assert.ok(tool);

  const expected = {
    OWNER: true,
    ADMIN: true,
    MANAGER: false,
    MEMBER: false,
    VIEWER: false
  };

  for (const [role, allowed] of Object.entries(expected)) {
    const capabilities = getAgentCapabilities(role);

    const decision = evaluateToolPolicy({
      capabilities,
      tool
    });

    assert.equal(
      decision.allowed,
      allowed,
      `${role} delete_project capability mismatch`
    );

    assert.equal(
      decision.reason,
      allowed
        ? "CAPABILITY_GRANTED"
        : "CAPABILITY_DENIED"
    );
  }
});

test("github_list_repositories capability and OAuth scope policy", () => {
  const tool = getAgentTool("github_list_repositories");

  assert.ok(tool);
  assert.deepEqual(tool.oauthScopes, []);

  const expected = {
    OWNER: true,
    ADMIN: true,
    MANAGER: false,
    MEMBER: false,
    VIEWER: false
  };

  for (const [role, allowed] of Object.entries(expected)) {
    const capabilities = getAgentCapabilities(role);

    const decision = evaluateToolPolicy({
      capabilities,
      tool
    });

    assert.equal(
      decision.allowed,
      allowed,
      `${role} github_list_repositories capability mismatch`
    );

    assert.equal(
      decision.reason,
      allowed
        ? "CAPABILITY_GRANTED"
        : "CAPABILITY_DENIED"
    );
  }
});

test("missing capabilities are denied", () => {
  const tool = getAgentTool("delete_task");

  const decision = evaluateToolPolicy({
    capabilities: undefined,
    tool
  });

  assert.deepEqual(decision, {
    allowed: false,
    reason: "CAPABILITIES_MISSING"
  });
});

test("empty capabilities are denied", () => {
  const tool = getAgentTool("delete_task");

  const decision = evaluateToolPolicy({
    capabilities: [],
    tool
  });

  assert.deepEqual(decision, {
    allowed: false,
    reason: "CAPABILITY_DENIED"
  });
});

test("tool without a capability requirement is denied", () => {
  const capabilities = getAgentCapabilities("OWNER");

  const decision = evaluateToolPolicy({
    capabilities,
    tool: {
      name: "test_tool"
    }
  });

  assert.deepEqual(decision, {
    allowed: false,
    reason: "TOOL_CAPABILITY_MISSING"
  });
});

