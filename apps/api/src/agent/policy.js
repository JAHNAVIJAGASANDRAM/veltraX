import { hasAgentCapability } from "./capabilities.js";

export function evaluateToolPolicy({
  capabilities,
  tool
}) {
  if (!Array.isArray(capabilities)) {
    return {
      allowed: false,
      reason: "CAPABILITIES_MISSING"
    };
  }

  if (!tool) {
    return {
      allowed: false,
      reason: "TOOL_NOT_FOUND"
    };
  }

  if (!tool.capability) {
    return {
      allowed: false,
      reason: "TOOL_CAPABILITY_MISSING"
    };
  }

  if (!hasAgentCapability(
    capabilities,
    tool.capability
  )) {
    return {
      allowed: false,
      reason: "CAPABILITY_DENIED"
    };
  }

  return {
    allowed: true,
    reason: "CAPABILITY_GRANTED"
  };
}
