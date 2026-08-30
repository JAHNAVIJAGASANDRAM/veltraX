import express from "express";
import { requireAuth } from "../auth/middleware.js";
import {
  getOAuthGrant,
  revokeOAuthGrant
} from "../oauth/grants.js";

const router = express.Router();

/*
 * GET /api/oauth/grants
 *
 * Return the authenticated user's active OAuth grants.
 * Access tokens are never returned.
 */
router.get("/grants", requireAuth, async (req, res, next) => {
  try {
    const providers = ["google", "github", "microsoft"];

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
          providerUserId: grant.providerUserId,
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
});

/*
 * DELETE /api/oauth/grants/:provider
 *
 * Revoke the authenticated user's OAuth grant.
 */
router.delete(
  "/grants/:provider",
  requireAuth,
  async (req, res, next) => {
    const provider = req.params.provider?.trim().toLowerCase();

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
