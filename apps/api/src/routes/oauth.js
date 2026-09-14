import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  getOAuthGrant,
  revokeOAuthGrant,
  upsertOAuthGrant
} from "../oauth/grants.js";
import {
  createOAuthState,
  consumeOAuthState
} from "../oauth/state.js";

const router = express.Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET =
  process.env.GITHUB_CLIENT_SECRET;
const GITHUB_OAUTH_REDIRECT_URI =
  process.env.GITHUB_OAUTH_REDIRECT_URI ||
  "http://localhost:4000/api/oauth/github/callback";

function requireGitHubConfig() {
  if (
    !GITHUB_CLIENT_ID ||
    !GITHUB_CLIENT_SECRET ||
    !GITHUB_OAUTH_REDIRECT_URI
  ) {
    throw new Error(
      "GitHub OAuth is not configured"
    );
  }
}

/*
 * GET /api/oauth/github
 *
 * Start the GitHub OAuth authorization flow.
 *
 * The authenticated user's identity is established by
 * requireAuth. The agent/user cannot supply the user ID.
 */
router.get(
  "/github",
  requireAuth,
  async (req, res, next) => {
    try {
      requireGitHubConfig();

      const state = await createOAuthState({
        userId: req.user.id,
        sessionId: req.session.id,
        provider: "github"
      });

      const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_OAUTH_REDIRECT_URI,
        scope: "read:user user:email",
        state
      });

      return res.redirect(
        `https://github.com/login/oauth/authorize?${params.toString()}`
      );
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/oauth/github/callback
 *
 * Complete the GitHub OAuth authorization flow.
 */
router.get(
  "/github/callback",
  requireAuth,
  async (req, res, next) => {
    try {
      requireGitHubConfig();

      const { code, state } = req.query;

      if (
        typeof code !== "string" ||
        !code
      ) {
        return res.status(400).json({
          error: "GitHub authorization code is required"
        });
      }

      if (
        typeof state !== "string" ||
        !state
      ) {
        return res.status(400).json({
          error: "OAuth state is required"
        });
      }

      const oauthState = await consumeOAuthState({
        state,
        sessionId: req.session.id,
        provider: "github"
      });

      if (!oauthState) {
        return res.status(400).json({
          error: "Invalid or expired OAuth state"
        });
      }

      const tokenResponse = await fetch(
        "https://github.com/login/oauth/access_token",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: GITHUB_OAUTH_REDIRECT_URI
          })
        }
      );

      if (!tokenResponse.ok) {
        return res.status(502).json({
          error: "GitHub token exchange failed"
        });
      }

      const tokenData = await tokenResponse.json();

      if (
        typeof tokenData.access_token !== "string" ||
        !tokenData.access_token
      ) {
        return res.status(502).json({
          error: "GitHub did not return an access token"
        });
      }

      const accessToken = tokenData.access_token;

      const userResponse = await fetch(
        "https://api.github.com/user",
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "VeltraX"
          }
        }
      );

      if (!userResponse.ok) {
        return res.status(502).json({
          error: "GitHub identity lookup failed"
        });
      }

      const githubUser = await userResponse.json();

      if (
        githubUser.id === undefined ||
        githubUser.id === null
      ) {
        return res.status(502).json({
          error: "GitHub identity response is invalid"
        });
      }

      const scopes =
        typeof tokenData.scope === "string" &&
        tokenData.scope
          ? tokenData.scope
              .split(",")
              .map((scope) => scope.trim())
              .filter(Boolean)
          : [];

      await upsertOAuthGrant({
        userId: oauthState.userId,
        provider: "github",
        providerUserId: String(githubUser.id),
        accessToken,
        scopes
      });

      return res.status(200).json({
        status: "connected",
        provider: "github"
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * GET /api/oauth/grants
 *
 * Return the authenticated user's active OAuth grants.
 * Access tokens are never returned.
 */
router.get(
  "/grants",
  requireAuth,
  async (req, res, next) => {
    try {
      const providers = [
        "google",
        "github",
        "microsoft"
      ];

      const grants = [];

      for (const provider of providers) {
        const grant = await getOAuthGrant({
          userId: req.user.id,
          provider
        });

        if (grant) {
          grants.push({
            id: grant.id,
            provider: grant.provider,
            providerUserId:
              grant.providerUserId,
            scopes: grant.scopes,
            createdAt: grant.createdAt,
            updatedAt: grant.updatedAt,
            revokedAt: grant.revokedAt
          });
        }
      }

      return res.status(200).json({
        grants
      });
    } catch (error) {
      next(error);
    }
  }
);

/*
 * DELETE /api/oauth/grants/:provider
 *
 * Revoke the authenticated user's OAuth grant.
 */
router.delete(
  "/grants/:provider",
  requireAuth,
  async (req, res, next) => {
    const provider =
      req.params.provider?.trim().toLowerCase();

    if (!provider) {
      return res.status(400).json({
        error: "provider is required"
      });
    }

    try {
      const revoked = await revokeOAuthGrant({
        userId: req.user.id,
        provider
      });

      if (!revoked) {
        return res.status(404).json({
          error: "OAuth grant not found"
        });
      }

      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
