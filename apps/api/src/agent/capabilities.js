import {
  PERMISSIONS,
  ROLE_PERMISSIONS
} from "../authorization/permissions.js";

export const AGENT_CAPABILITIES = Object.freeze({
  PROJECT_VIEW: PERMISSIONS.PROJECT_VIEW,
  PROJECT_CREATE: PERMISSIONS.PROJECT_CREATE,
  PROJECT_UPDATE: PERMISSIONS.PROJECT_UPDATE,
  PROJECT_DELETE: PERMISSIONS.PROJECT_DELETE,

  TASK_VIEW: PERMISSIONS.TASK_VIEW,
  TASK_CREATE: PERMISSIONS.TASK_CREATE,
  TASK_UPDATE: PERMISSIONS.TASK_UPDATE,
  TASK_DELETE: PERMISSIONS.TASK_DELETE
});

export function getAgentCapabilities(role) {
  if (!role) {
    return [];
  }

  return Object.freeze([
    ...(ROLE_PERMISSIONS[role] || [])
  ]);
}

export function hasAgentCapability(capabilities, requiredCapability) {
  if (!Array.isArray(capabilities)) {
    return false;
  }

  if (!requiredCapability) {
    return false;
  }

  return capabilities.includes(requiredCapability);
}
