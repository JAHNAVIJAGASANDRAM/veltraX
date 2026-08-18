const MAX_PROJECT_NAME_LENGTH = 255;
const MAX_PROJECT_DESCRIPTION_LENGTH = 5000;
const MAX_TASK_TITLE_LENGTH = 255;
const MAX_TASK_DESCRIPTION_LENGTH = 5000;

const VALID_TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "DONE"
];

function validateObject(toolArguments) {
  return (
    toolArguments !== null &&
    typeof toolArguments === "object" &&
    !Array.isArray(toolArguments)
  );
}

function unknownArguments(toolArguments, allowedKeys) {
  return Object.keys(toolArguments).filter(
    (key) => !allowedKeys.includes(key)
  );
}

export function validateToolArguments(toolName, toolArguments = {}) {
  if (!validateObject(toolArguments)) {
    return {
      valid: false,
      error: "Tool arguments must be an object"
    };
  }

  if (toolName === "list_projects") {
    const unknownKeys = unknownArguments(toolArguments, []);

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    return {
      valid: true,
      arguments: {}
    };
  }

  if (toolName === "create_project") {
    const allowedKeys = ["name", "description"];
    const unknownKeys = unknownArguments(toolArguments, allowedKeys);

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    if (typeof toolArguments.name !== "string") {
      return {
        valid: false,
        error: "name must be a string"
      };
    }

    const name = toolArguments.name.trim();

    if (!name) {
      return {
        valid: false,
        error: "name is required"
      };
    }

    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      return {
        valid: false,
        error: `name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`
      };
    }

    if (
      toolArguments.description !== undefined &&
      toolArguments.description !== null &&
      typeof toolArguments.description !== "string"
    ) {
      return {
        valid: false,
        error: "description must be a string or null"
      };
    }

    if (
      typeof toolArguments.description === "string" &&
      toolArguments.description.length > MAX_PROJECT_DESCRIPTION_LENGTH
    ) {
      return {
        valid: false,
        error: `description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or fewer`
      };
    }

    return {
      valid: true,
      arguments: {
        name,
        description:
          typeof toolArguments.description === "string"
            ? toolArguments.description.trim() || null
            : null
      }
    };
  }

  if (toolName === "update_project") {
    const allowedKeys = [
      "project_id",
      "name",
      "description"
    ];

    const unknownKeys = unknownArguments(toolArguments, allowedKeys);

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    if (typeof toolArguments.project_id !== "string") {
      return {
        valid: false,
        error: "project_id must be a string"
      };
    }

    const projectId = toolArguments.project_id.trim();

    if (!projectId) {
      return {
        valid: false,
        error: "project_id is required"
      };
    }

    if (typeof toolArguments.name !== "string") {
      return {
        valid: false,
        error: "name must be a string"
      };
    }

    const name = toolArguments.name.trim();

    if (!name) {
      return {
        valid: false,
        error: "name is required"
      };
    }

    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      return {
        valid: false,
        error: `name must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`
      };
    }

    if (
      toolArguments.description !== undefined &&
      toolArguments.description !== null &&
      typeof toolArguments.description !== "string"
    ) {
      return {
        valid: false,
        error: "description must be a string or null"
      };
    }

    if (
      typeof toolArguments.description === "string" &&
      toolArguments.description.length > MAX_PROJECT_DESCRIPTION_LENGTH
    ) {
      return {
        valid: false,
        error: `description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or fewer`
      };
    }

    return {
      valid: true,
      arguments: {
        projectId,
        name,
        description:
          typeof toolArguments.description === "string"
            ? toolArguments.description.trim() || null
            : null
      }
    };
  }

  if (toolName === "list_tasks") {
    const allowedKeys = ["project_id"];
    const unknownKeys = unknownArguments(toolArguments, allowedKeys);

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    if (typeof toolArguments.project_id !== "string") {
      return {
        valid: false,
        error: "project_id must be a string"
      };
    }

    const projectId = toolArguments.project_id.trim();

    if (!projectId) {
      return {
        valid: false,
        error: "project_id is required"
      };
    }

    return {
      valid: true,
      arguments: {
        projectId
      }
    };
  }

  if (toolName === "create_task") {
    const allowedKeys = [
      "project_id",
      "title",
      "description",
      "status",
      "assigned_to"
    ];

    const unknownKeys = unknownArguments(toolArguments, allowedKeys);

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    if (typeof toolArguments.project_id !== "string") {
      return {
        valid: false,
        error: "project_id must be a string"
      };
    }

    const projectId = toolArguments.project_id.trim();

    if (!projectId) {
      return {
        valid: false,
        error: "project_id is required"
      };
    }

    if (typeof toolArguments.title !== "string") {
      return {
        valid: false,
        error: "title must be a string"
      };
    }

    const title = toolArguments.title.trim();

    if (!title) {
      return {
        valid: false,
        error: "title is required"
      };
    }

    if (title.length > MAX_TASK_TITLE_LENGTH) {
      return {
        valid: false,
        error: `title must be ${MAX_TASK_TITLE_LENGTH} characters or fewer`
      };
    }

    if (
      toolArguments.description !== undefined &&
      toolArguments.description !== null &&
      typeof toolArguments.description !== "string"
    ) {
      return {
        valid: false,
        error: "description must be a string or null"
      };
    }

    if (
      typeof toolArguments.description === "string" &&
      toolArguments.description.length > MAX_TASK_DESCRIPTION_LENGTH
    ) {
      return {
        valid: false,
        error: `description must be ${MAX_TASK_DESCRIPTION_LENGTH} characters or fewer`
      };
    }

    if (
      toolArguments.status !== undefined &&
      !VALID_TASK_STATUSES.includes(toolArguments.status)
    ) {
      return {
        valid: false,
        error: `status must be one of: ${VALID_TASK_STATUSES.join(", ")}`
      };
    }

    if (
      toolArguments.assigned_to !== undefined &&
      toolArguments.assigned_to !== null &&
      typeof toolArguments.assigned_to !== "string"
    ) {
      return {
        valid: false,
        error: "assigned_to must be a string or null"
      };
    }

    return {
      valid: true,
      arguments: {
        projectId,
        title,
        description:
          typeof toolArguments.description === "string"
            ? toolArguments.description.trim() || null
            : null,
        status: toolArguments.status || "TODO",
        assignedTo:
          typeof toolArguments.assigned_to === "string"
            ? toolArguments.assigned_to.trim() || null
            : null
      }
    };
  }

  if (toolName === "update_task") {
    const allowedKeys = [
      "task_id",
      "title",
      "description",
      "status",
      "assigned_to"
    ];

    const unknownKeys = Object.keys(toolArguments).filter(
      (key) => !allowedKeys.includes(key)
    );

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    if (typeof toolArguments.task_id !== "string") {
      return {
        valid: false,
        error: "task_id must be a string"
      };
    }

    if (!toolArguments.task_id.trim()) {
      return {
        valid: false,
        error: "task_id is required"
      };
    }

    if (typeof toolArguments.title !== "string") {
      return {
        valid: false,
        error: "title must be a string"
      };
    }

    const title = toolArguments.title.trim();

    if (!title) {
      return {
        valid: false,
        error: "title is required"
      };
    }

    if (title.length > MAX_PROJECT_NAME_LENGTH) {
      return {
        valid: false,
        error: `title must be ${MAX_PROJECT_NAME_LENGTH} characters or fewer`
      };
    }

    if (
      toolArguments.description !== undefined &&
      toolArguments.description !== null &&
      typeof toolArguments.description !== "string"
    ) {
      return {
        valid: false,
        error: "description must be a string or null"
      };
    }

    if (
      typeof toolArguments.description === "string" &&
      toolArguments.description.length > MAX_PROJECT_DESCRIPTION_LENGTH
    ) {
      return {
        valid: false,
        error: `description must be ${MAX_PROJECT_DESCRIPTION_LENGTH} characters or fewer`
      };
    }

    const validStatuses = [
      "TODO",
      "IN_PROGRESS",
      "DONE"
    ];

    if (
      typeof toolArguments.status !== "string" ||
      !validStatuses.includes(toolArguments.status)
    ) {
      return {
        valid: false,
        error: "status must be one of: TODO, IN_PROGRESS, DONE"
      };
    }

    if (
      toolArguments.assigned_to !== undefined &&
      toolArguments.assigned_to !== null &&
      typeof toolArguments.assigned_to !== "string"
    ) {
      return {
        valid: false,
        error: "assigned_to must be a string or null"
      };
    }

    return {
      valid: true,
      arguments: {
        taskId: toolArguments.task_id.trim(),
        title,
        description:
          typeof toolArguments.description === "string"
            ? toolArguments.description.trim() || null
            : null,
        status: toolArguments.status,
        assignedTo:
          typeof toolArguments.assigned_to === "string"
            ? toolArguments.assigned_to.trim() || null
            : null
      }
    };
  }
  return {
    valid: false,
    error: "No argument validator registered for this tool"
  };
}

