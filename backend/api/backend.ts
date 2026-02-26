import type express from "express";
import type { Pool } from "mysql2/promise";

type SystemApiDeps = {
  getEconomicStats: () => Promise<any>;
  db: Pool | null;
  serverStartedAt: number;
};

export function registerBackendApiRoutes(app: express.Express, deps: SystemApiDeps) {
  // Route: GET /api/economic-stats
  // Purpose: Return aggregated economic dashboard metrics for the frontend.
  app.get("/api/economic-stats", async (_req, res) => {
    try {
      const stats = await deps.getEconomicStats();
      res.json(stats);
    } catch {
      res.status(500).json({ message: "Failed to load economic stats." });
    }
  });

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
      service: "zigd-platform",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(deps.serverStartedAt).toISOString(),
      now: new Date().toISOString(),
    });
  });
}
