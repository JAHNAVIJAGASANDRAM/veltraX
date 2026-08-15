import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db/pool.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import workspaceRoutes from "./routes/workspaces.js";
import projectsRouter from "./routes/projects.js";
import tasksRouter from "./routes/tasks.js";

const app = express();

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

if (!FRONTEND_ORIGIN) {
  throw new Error("FRONTEND_ORIGIN is not configured");
}

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", projectsRouter);
app.use("/api/workspaces", tasksRouter);

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1");

    res.status(200).json({
      status: "ok",
      database: result.rowCount === 1 ? "connected" : "unknown"
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      database: "disconnected"
    });
  }
});

app.listen(PORT, () => {
  console.log(`VeltraX API running on http://localhost:${PORT}`);
});