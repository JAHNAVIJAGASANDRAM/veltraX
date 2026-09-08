import { AGENT_CAPABILITIES } from "./capabilities.js";
import {
  listProjects,
  createProject,
  updateProject
} from "./tools/projects.js";
import {
  listTasks,
  createTask,
  updateTask
} from "./tools/tasks.js";
import { deleteTask } from "./tools/delete-task.js";
import { deleteProject } from "./tools/delete-project.js";
import {
  getGitHubUser,
  listGitHubRepositories
} from "./tools/github.js";

export const AGENT_TOOLS = Object.freeze({
  list_projects: {
    name: "list_projects",
    description: "List projects in the authenticated workspace.",
    capability: AGENT_CAPABILITIES.PROJECT_VIEW,
    action: "PROJECT_VIEW",
    resourceType: "PROJECT",
    execute: listProjects
  },

  create_project: {
    name: "create_project",
    description: "Create a project in the authenticated workspace.",
    capability: AGENT_CAPABILITIES.PROJECT_CREATE,
    action: "PROJECT_CREATE",
    resourceType: "PROJECT",
    execute: createProject
  },

  update_project: {
    name: "update_project",
    description: "Update a project in the authenticated workspace.",
    capability: AGENT_CAPABILITIES.PROJECT_UPDATE,
    action: "PROJECT_UPDATE",
    resourceType: "PROJECT",
    execute: updateProject
  },

  delete_project: {
    name: "delete_project",
    description: "Delete a project within the authenticated workspace.",
    capability: AGENT_CAPABILITIES.PROJECT_DELETE,
    action: "PROJECT_DELETE",
    resourceType: "PROJECT",
    execute: deleteProject
  },

  list_tasks: {
    name: "list_tasks",
    description: "List tasks belonging to a project in the authenticated workspace.",
    capability: AGENT_CAPABILITIES.TASK_VIEW,
    action: "TASK_VIEW",
    resourceType: "TASK",
    execute: listTasks
  },

  create_task: {
    name: "create_task",
    description: "Create a task in a project in the authenticated workspace.",
    capability: AGENT_CAPABILITIES.TASK_CREATE,
    action: "TASK_CREATE",
    resourceType: "TASK",
    execute: createTask
  },

  update_task: {
    name: "update_task",
    description: "Update a task within the authenticated workspace.",
    capability: AGENT_CAPABILITIES.TASK_UPDATE,
    action: "TASK_UPDATE",
    resourceType: "TASK",
    execute: updateTask
  },

  delete_task: {
    name: "delete_task",
    description: "Delete a task within the authenticated workspace.",
    capability: AGENT_CAPABILITIES.TASK_DELETE,
    action: "TASK_DELETE",
    resourceType: "TASK",
    execute: deleteTask
  },

  github_get_user: {
    name: "github_get_user",
    description: "Get the authenticated user's GitHub identity.",
    capability: AGENT_CAPABILITIES.GITHUB_USER_VIEW,
    action: "GITHUB_USER_VIEW",
    resourceType: "GITHUB_USER",
    oauthProvider: "github",
    oauthScopes: ["read:user"],
    execute: getGitHubUser
  },

  github_list_repositories: {
    name: "github_list_repositories",
    description: "List repositories accessible to the authenticated GitHub user.",
    capability: AGENT_CAPABILITIES.GITHUB_REPOSITORY_VIEW,
    action: "GITHUB_REPOSITORY_VIEW",
    resourceType: "GITHUB_REPOSITORY",
    oauthProvider: "github",
    oauthScopes: [],
    execute: listGitHubRepositories
  }
});

export function getAgentTool(toolName) {
  return AGENT_TOOLS[toolName] || null;
}
