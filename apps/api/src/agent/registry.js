import { PERMISSIONS } from "../authorization/permissions.js";
import { listProjects ,createProject ,updateProject } from "./tools/projects.js";

export const AGENT_TOOLS = Object.freeze({
  list_projects: {
    name: "list_projects",
    description: "List projects in the authenticated workspace.",
    permission: PERMISSIONS.PROJECT_VIEW,
    action: "PROJECT_VIEW",
    resourceType: "PROJECT",
    execute: listProjects
  },
  create_project: {
    name: "create_project",
    description: "Create a project in the authenticated workspace.",
    permission: PERMISSIONS.PROJECT_CREATE,
    action: "PROJECT_CREATE",
    resourceType: "PROJECT",
    execute: createProject
  },
    update_project: {
    name: "update_project",
    description: "Update a project in the authenticated workspace.",
    permission: PERMISSIONS.PROJECT_UPDATE,
    action: "PROJECT_UPDATE",
    resourceType: "PROJECT",
    execute: updateProject
  }
});

export function getAgentTool(toolName) {
  return AGENT_TOOLS[toolName] || null;
}