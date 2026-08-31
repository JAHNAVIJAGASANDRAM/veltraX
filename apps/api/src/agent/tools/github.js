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

