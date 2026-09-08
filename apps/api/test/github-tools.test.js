import test from "node:test";
import assert from "node:assert/strict";
import { mock } from "node:test";

import {
  listGitHubRepositories,
  getGitHubRepository
} from "../src/agent/tools/github.js";

test("listGitHubRepositories sends the delegated token and returns safe repository fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async (url, options) => {
    assert.equal(
      url,
      "https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc"
    );

    assert.equal(
      options.headers.Authorization,
      "Bearer delegated-github-token"
    );

    assert.equal(
      options.headers.Accept,
      "application/vnd.github+json"
    );

    assert.equal(
      options.headers["X-GitHub-Api-Version"],
      "2022-11-28"
    );

    return new Response(
      JSON.stringify([
        {
          id: 101,
          name: "veltrax",
          full_name: "example/veltrax",
          description: "VeltraX repository",
          private: true,
          html_url: "https://github.com/example/veltrax",
          default_branch: "main",
          owner: {
            login: "example"
          },
          permissions: {
            admin: true
          }
        }
      ]),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  });

  try {
    const result = await listGitHubRepositories({
      oauthGrant: {
        accessToken: "delegated-github-token"
      }
    });

    assert.deepEqual(result, {
      repositories: [
        {
          id: 101,
          name: "veltrax",
          fullName: "example/veltrax",
          description: "VeltraX repository",
          private: true,
          htmlUrl: "https://github.com/example/veltrax",
          defaultBranch: "main"
        }
      ]
    });

    assert.equal(result.repositories[0].permissions, undefined);
    assert.equal(result.repositories[0].owner, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listGitHubRepositories requires an OAuth grant", async () => {
  await assert.rejects(
    () => listGitHubRepositories({}),
    (error) => {
      assert.equal(
        error.message,
        "GitHub OAuth grant is required"
      );
      return true;
    }
  );
});

test("listGitHubRepositories converts GitHub API failures to a safe error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () => {
    return new Response(
      JSON.stringify({
        message: "Bad credentials",
        documentation_url: "https://docs.github.com/"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  });

  try {
    await assert.rejects(
      () =>
        listGitHubRepositories({
          oauthGrant: {
            accessToken: "delegated-github-token"
          }
        }),
      (error) => {
        assert.equal(
          error.code,
          "GITHUB_REPOSITORY_LOOKUP_FAILED"
        );
        assert.equal(
          error.message,
          "GitHub repository lookup failed"
        );
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("getGitHubRepository sends owner and repo to GitHub and returns safe fields", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async (url, options) => {
    assert.equal(
      url,
      "https://api.github.com/repos/octocat/hello-world"
    );

    assert.equal(
      options.headers.Authorization,
      "Bearer delegated-github-token"
    );

    assert.equal(
      options.headers.Accept,
      "application/vnd.github+json"
    );

    assert.equal(
      options.headers["X-GitHub-Api-Version"],
      "2022-11-28"
    );

    return new Response(
      JSON.stringify({
        id: 101,
        name: "hello-world",
        full_name: "octocat/hello-world",
        description: "Example repository",
        private: false,
        html_url: "https://github.com/octocat/hello-world",
        default_branch: "main",
        owner: {
          login: "octocat"
        },
        permissions: {
          admin: true,
          push: true,
          pull: true
        },
        visibility: "public"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  });

  try {
    const result = await getGitHubRepository({
      oauthGrant: {
        accessToken: "delegated-github-token"
      },
      owner: "octocat",
      repo: "hello-world"
    });

    assert.deepEqual(result, {
      repository: {
        id: 101,
        name: "hello-world",
        fullName: "octocat/hello-world",
        description: "Example repository",
        private: false,
        htmlUrl: "https://github.com/octocat/hello-world",
        defaultBranch: "main"
      }
    });

    assert.equal(
      result.repository.permissions,
      undefined
    );

    assert.equal(
      result.repository.owner,
      undefined
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getGitHubRepository requires an OAuth grant", async () => {
  await assert.rejects(
    () =>
      getGitHubRepository({
        owner: "octocat",
        repo: "hello-world"
      }),
    (error) => {
      assert.equal(
        error.message,
        "GitHub OAuth grant is required"
      );
      return true;
    }
  );
});

test("getGitHubRepository converts GitHub API failures to a safe error", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () => {
    return new Response(
      JSON.stringify({
        message: "Not Found"
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  });

  try {
    await assert.rejects(
      () =>
        getGitHubRepository({
          oauthGrant: {
            accessToken: "delegated-github-token"
          },
          owner: "octocat",
          repo: "missing-repository"
        }),
      (error) => {
        assert.equal(
          error.code,
          "GITHUB_REPOSITORY_LOOKUP_FAILED"
        );
        assert.equal(
          error.message,
          "GitHub repository lookup failed"
        );
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
