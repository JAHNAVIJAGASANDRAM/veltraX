import test from "node:test";
import assert from "node:assert/strict";

import { validateToolArguments } from "../src/agent/validation.js";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

test("delete_task accepts a valid task UUID", () => {
  const result = validateToolArguments("delete_task", {
    task_id: VALID_UUID
  });

  assert.deepEqual(result, {
    valid: true,
    arguments: {
      taskId: VALID_UUID
    }
  });
});

test("delete_project accepts a valid project UUID", () => {
  const result = validateToolArguments("delete_project", {
    project_id: VALID_UUID
  });

  assert.deepEqual(result, {
    valid: true,
    arguments: {
      projectId: VALID_UUID
    }
  });
});

test("delete_task rejects invalid UUID", () => {
  const result = validateToolArguments("delete_task", {
    task_id: "not-a-valid-uuid"
  });

  assert.deepEqual(result, {
    valid: false,
    error: "task_id must be a valid UUID"
  });
});

test("delete_project rejects invalid UUID", () => {
  const result = validateToolArguments("delete_project", {
    project_id: "not-a-valid-uuid"
  });

  assert.deepEqual(result, {
    valid: false,
    error: "project_id must be a valid UUID"
  });
});

test("delete_task rejects empty task ID", () => {
  const result = validateToolArguments("delete_task", {
    task_id: ""
  });

  assert.deepEqual(result, {
    valid: false,
    error: "task_id is required"
  });
});

test("delete_project rejects empty project ID", () => {
  const result = validateToolArguments("delete_project", {
    project_id: ""
  });

  assert.deepEqual(result, {
    valid: false,
    error: "project_id is required"
  });
});

test("delete_task rejects unknown arguments", () => {
  const result = validateToolArguments("delete_task", {
    task_id: VALID_UUID,
    extra: "blocked"
  });

  assert.deepEqual(result, {
    valid: false,
    error: "Unknown arguments: extra"
  });
});

test("delete_project rejects unknown arguments", () => {
  const result = validateToolArguments("delete_project", {
    project_id: VALID_UUID,
    extra: "blocked"
  });

  assert.deepEqual(result, {
    valid: false,
    error: "Unknown arguments: extra"
  });
});

test("delete_task rejects non-string task ID", () => {
  const result = validateToolArguments("delete_task", {
    task_id: 123
  });

  assert.deepEqual(result, {
    valid: false,
    error: "task_id must be a string"
  });
});

test("delete_project rejects non-string project ID", () => {
  const result = validateToolArguments("delete_project", {
    project_id: 123
  });

  assert.deepEqual(result, {
    valid: false,
    error: "project_id must be a string"
  });
});

test("github_get_repository accepts valid owner and repo", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: "octocat",
      repo: "hello-world"
    }
  );

  assert.deepEqual(result, {
    valid: true,
    arguments: {
      owner: "octocat",
      repo: "hello-world"
    }
  });
});

test("github_get_repository trims owner and repo", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: " octocat ",
      repo: " hello-world "
    }
  );

  assert.deepEqual(result, {
    valid: true,
    arguments: {
      owner: "octocat",
      repo: "hello-world"
    }
  });
});

test("github_get_repository rejects empty owner", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: "",
      repo: "hello-world"
    }
  );

  assert.deepEqual(result, {
    valid: false,
    error: "owner is required"
  });
});

test("github_get_repository rejects empty repo", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: "octocat",
      repo: ""
    }
  );

  assert.deepEqual(result, {
    valid: false,
    error: "repo is required"
  });
});

test("github_get_repository rejects non-string owner", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: 123,
      repo: "hello-world"
    }
  );

  assert.deepEqual(result, {
    valid: false,
    error: "owner must be a string"
  });
});

test("github_get_repository rejects non-string repo", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: "octocat",
      repo: 123
    }
  );

  assert.deepEqual(result, {
    valid: false,
    error: "repo must be a string"
  });
});

test("github_get_repository rejects unknown arguments", () => {
  const result = validateToolArguments(
    "github_get_repository",
    {
      owner: "octocat",
      repo: "hello-world",
      extra: "blocked"
    }
  );

  assert.deepEqual(result, {
    valid: false,
    error: "Unknown arguments: extra"
  });
});
