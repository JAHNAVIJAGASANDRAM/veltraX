const MAX_PROJECT_NAME_LENGTH = 255;
const MAX_PROJECT_DESCRIPTION_LENGTH = 5000;

export function validateToolArguments(toolName, toolArguments = {}) {
  if (
    toolArguments === null ||
    typeof toolArguments !== "object" ||
    Array.isArray(toolArguments)
  ) {
    return {
      valid: false,
      error: "Tool arguments must be an object"
    };
  }

  if (toolName === "list_projects") {
    const allowedKeys = [];

    const unknownKeys = Object.keys(toolArguments).filter(
      (key) => !allowedKeys.includes(key)
    );

    if (unknownKeys.length > 0) {
      return {
        valid: false,
        error: `Unknown arguments: ${unknownKeys.join(", ")}`
      };
    }

    return {
      valid: true
    };
  }

  if (toolName === "create_project") {
    const allowedKeys = ["name", "description"];

    const unknownKeys = Object.keys(toolArguments).filter(
      (key) => !allowedKeys.includes(key)
    );

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

    const unknownKeys = Object.keys(toolArguments).filter(
      (key) => !allowedKeys.includes(key)
    );

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

    if (!toolArguments.project_id.trim()) {
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
        projectId: toolArguments.project_id.trim(),
        name,
        description:
          typeof toolArguments.description === "string"
            ? toolArguments.description.trim() || null
            : null
      }
    };
  }

  return {
    valid: false,
    error: "No argument validator registered for this tool"
  };
}

