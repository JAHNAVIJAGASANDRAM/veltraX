import { getOAuthGrant } from "../oauth/grants.js";

export async function requireOAuthGrant({
  userId,
  provider,
  requiredScopes = []
}) {
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!provider) {
    throw new Error("provider is required");
  }

  if (!Array.isArray(requiredScopes)) {
    throw new Error("requiredScopes must be an array");
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

  const grantedScopes = new Set(
    Array.isArray(grant.scopes)
      ? grant.scopes
      : []
  );

  const missingScopes = requiredScopes.filter(
    (scope) => !grantedScopes.has(scope)
  );

  if (missingScopes.length > 0) {
    const error = new Error(
      "Required OAuth scopes are missing"
    );

    error.code = "OAUTH_SCOPE_MISSING";
    error.missingScopes = missingScopes;

    throw error;
  }

  return grant;
}
