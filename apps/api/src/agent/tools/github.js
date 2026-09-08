export async function getGitHubUser({
  userId,
  oauthGrant
}) {
  if (!oauthGrant) {
    throw new Error("GitHub OAuth grant is required");
  }

  const response = await fetch(
    "https://api.github.com/user",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${oauthGrant.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "VeltraX"
      }
    }
  );

  if (!response.ok) {
    const error = new Error(
      "GitHub identity lookup failed"
    );

    error.code = "GITHUB_IDENTITY_LOOKUP_FAILED";

    throw error;
  }

  const githubUser = await response.json();

  return {
    user: {
      id: githubUser.id,
      login: githubUser.login,
      name: githubUser.name,
      email: githubUser.email
    }
  };
}
export async function listGitHubRepositories({
  oauthGrant
}) {
  if (!oauthGrant) {
    throw new Error("GitHub OAuth grant is required");
  }

  const response = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated&direction=desc",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${oauthGrant.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "VeltraX"
      }
    }
  );

  if (!response.ok) {
    const error = new Error(
      "GitHub repository lookup failed"
    );

    error.code = "GITHUB_REPOSITORY_LOOKUP_FAILED";

    throw error;
  }

  const repositories = await response.json();

  if (!Array.isArray(repositories)) {
    const error = new Error(
      "GitHub repository response is invalid"
    );

    error.code = "GITHUB_REPOSITORY_RESPONSE_INVALID";

    throw error;
  }

  return {
    repositories: repositories.map((repository) => ({
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      description: repository.description,
      private: repository.private,
      htmlUrl: repository.html_url,
      defaultBranch: repository.default_branch
    }))
  };
}
