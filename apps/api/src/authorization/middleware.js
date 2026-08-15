import pool from "../db/pool.js";

export async function requireWorkspaceMember(req, res, next) {
  try {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        error: "workspaceId is required"
      });
    }

    const result = await pool.query(
      `
        SELECT
          wm.workspace_id,
          wm.user_id,
          wm.role,
          w.name AS workspace_name
        FROM workspace_members wm
        INNER JOIN workspaces w
          ON w.id = wm.workspace_id
        WHERE wm.workspace_id = $1
          AND wm.user_id = $2
      `,
      [workspaceId, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(403).json({
        error: "Workspace access denied"
      });
    }

    const membership = result.rows[0];

    req.workspace = {
      id: membership.workspace_id,
      name: membership.workspace_name,
      role: membership.role
    };

    next();
  } catch (error) {
    next(error);
  }
}