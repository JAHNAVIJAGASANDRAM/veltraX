import { getOAuthGrant } from "../oauth/grants.js";

export async function requireOAuthGrant({
  userId,
  provider
}) {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!provider) {
    throw new Error("provider is required");
  }

  const grant = await getOAuthGrant({
    userId,
    provider
  });

  if (!grant) {
    const error = new Error(
      "Required OAuth grant is not connected"
    );

    error.code = "OAUTH_GRANT_NOT_FOUND";

    throw error;
  }

  return grant;
}
