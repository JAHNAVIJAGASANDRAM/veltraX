import test from "node:test";
import assert from "node:assert/strict";

import { evaluateToolPolicy } from "../src/agent/policy.js";
import { getAgentTool } from "../src/agent/registry.js";

test("delete_task permission matrix", () => {
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
    const decision = evaluateToolPolicy({ role, tool });

    assert.equal(
      decision.allowed,
      allowed,
      `${role} delete_task permission mismatch`
    );

    assert.equal(
      decision.reason,
      allowed
        ? "PERMISSION_GRANTED"
        : "PERMISSION_DENIED"
    );
  }
});

test("delete_project permission matrix", () => {
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
    const decision = evaluateToolPolicy({ role, tool });

    assert.equal(
      decision.allowed,
      allowed,
      `${role} delete_project permission mismatch`
    );

    assert.equal(
      decision.reason,
      allowed
        ? "PERMISSION_GRANTED"
        : "PERMISSION_DENIED"
    );
  }
});

test("missing role is denied", () => {
  const tool = getAgentTool("delete_task");

  const decision = evaluateToolPolicy({
    role: null,
    tool
  });

  assert.deepEqual(decision, {
    allowed: false,
    reason: "ROLE_MISSING"
  });
});
