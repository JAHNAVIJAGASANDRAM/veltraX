import { getSession } from "./session.js";

const COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "veltrax_session";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        error: "Authentication required"
      });
    }

    const session = await getSession(token);

    if (!session) {
      return res.status(401).json({
        error: "Invalid or expired session"
      });
    }

    req.user = {
      id: session.userId,
      email: session.email
    };

    req.session = session;

    next();
  } catch (error) {
    next(error);
  }
}