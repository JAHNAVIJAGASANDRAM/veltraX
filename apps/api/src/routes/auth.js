import express from "express";
import { hashPassword } from "../auth/password.js";
import { createSession } from "../auth/session.js";
import pool from "../db/pool.js";
import { requireAuth } from "../auth/middleware.js";

const router = express.Router();

const COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "veltrax_session";

const SESSION_TTL_MS = Number(
  process.env.SESSION_TTL_MS || 86400000
);

router.post("/register", async (req, res, next) => {
  const { email, password, workspaceName } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof workspaceName !== "string"
  ) {
    return res.status(400).json({
      error: "email, password, and workspaceName are required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedWorkspaceName = workspaceName.trim();

  if (!normalizedEmail || !normalizedWorkspaceName) {
    return res.status(400).json({
      error: "email and workspaceName cannot be empty"
    });
  }

  if (password.length < 12) {
    return res.status(400).json({
      error: "password must be at least 12 characters"
    });
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (existingUser.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        error: "An account with that email already exists"
      });
    }

    const userResult = await client.query(
      `
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING id, email
      `,
      [normalizedEmail, passwordHash]
    );

    const user = userResult.rows[0];

    const workspaceResult = await client.query(
      `
        INSERT INTO workspaces (name)
        VALUES ($1)
        RETURNING id, name
      `,
      [normalizedWorkspaceName]
    );

    const workspace = workspaceResult.rows[0];

    await client.query(
      `
        INSERT INTO workspace_members (
          workspace_id,
          user_id,
          role
        )
        VALUES ($1, $2, 'OWNER')
      `,
      [workspace.id, user.id]
    );

    await client.query("COMMIT");

    const session = await createSession(user.id);

    res.cookie(COOKIE_NAME, session.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
      path: "/"
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email
      },
      workspace: {
        id: workspace.id,
        name: workspace.name
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});
router.get("/me", requireAuth, async (req, res) => {
  res.status(200).json({
    user: req.user
  });
});

export default router;