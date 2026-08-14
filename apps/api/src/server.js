import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db/pool.js";

const app = express();

const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

if (!FRONTEND_ORIGIN) {
  throw new Error("FRONTEND_ORIGIN is not configured");
}

app.use(
  cors({
    origin: FRONTEND_ORIGIN
  })
);

app.use(express.json());

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