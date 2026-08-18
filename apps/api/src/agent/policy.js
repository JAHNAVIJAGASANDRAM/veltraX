import { ROLE_PERMISSIONS } from "../authorization/permissions.js";

export function evaluateToolPolicy({
  role,
  tool
}) {
  if (!role) {
    return {
      allowed: false,
      reason: "ROLE_MISSING"
    };
  }

  if (!tool) {
    return {
      allowed: false,
      reason: "TOOL_NOT_FOUND"
    };
  }

  const permissions = ROLE_PERMISSIONS[role] || [];

  if (!permissions.includes(tool.permission)) {
    return {
      allowed: false,
      reason: "PERMISSION_DENIED"
    };
  }

  return {
    allowed: true,
    reason: "PERMISSION_GRANTED"
  };
}
