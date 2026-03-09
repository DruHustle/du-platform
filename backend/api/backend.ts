import type express from "express";
import type { Pool } from "mysql2/promise";

type SystemApiDeps = {
  db: Pool | null;
  serverStartedAt: number;
};

export function registerBackendApiRoutes(app: express.Express, deps: SystemApiDeps) {
  // Route: GET /api/health/db
  // Purpose: Report database connectivity state (mysql or memory fallback mode).
  app.get("/api/health/db", async (_req, res) => {
    if (!deps.db) {
      return res.json({ ok: true, mode: "memory-fallback", message: "No MySQL env vars set. Using in-memory fallback." });
    }
    try {
      await deps.db.query("SELECT 1");
      return res.json({ ok: true, mode: "mysql" });
    } catch {
      return res.status(500).json({ ok: false, mode: "mysql", error: "Database connection failed." });
    }
  });

  // Route: GET /api/ping
  // Purpose: Lightweight liveness/uptime probe that does not call upstream services.
  app.get("/api/ping", (_req, res) => {
    return res.json({
      ok: true,
      service: "du-platform",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(deps.serverStartedAt).toISOString(),
      now: new Date().toISOString(),
    });
  });
}
