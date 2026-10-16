import express from "express";
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
      // Avoid exposing mode details (memory-fallback vs mysql) to prevent information disclosure
      return res.status(503).json({ ok: false, error: "Database unavailable." });
    }
    try {
      await deps.db.query("SELECT 1");
      return res.json({ ok: true, mode: "mysql" });
    } catch {
      return res.status(500).json({ ok: false, error: "Database connection failed." });
    }
  });

  // Route: GET /api/ping
  // Purpose: Lightweight liveness/uptime probe that does not call upstream services.
  app.get("/api/ping", (_req, res) => {
    return res.json({
      ok: true,
      service: "du-platform",
      commit: process.env.APP_REVISION || null,
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(deps.serverStartedAt).toISOString(),
      now: new Date().toISOString(),
    });
  });

  // Route: POST /api/csp-report
  // Purpose: Receive Content-Security-Policy violation reports from browsers.
  // The body uses the `application/csp-report` or `application/reports+json` content type.
  // We accept any body, log it for monitoring, and always return 204.
  app.post(
    "/api/csp-report",
    express.json({ type: ["application/csp-report", "application/json", "application/reports+json"], limit: "16kb" }),
    express.text({ type: "text/plain", limit: "16kb" }),
    (req, res) => {
      try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const report = body?.["csp-report"] ?? body;
        console.warn("[csp-report]", JSON.stringify({
          blockedUri: report?.["blocked-uri"] ?? report?.blockedURL,
          violatedDirective: report?.["violated-directive"] ?? report?.effectiveDirective,
          documentUri: report?.["document-uri"] ?? report?.documentURL,
          referrer: report?.referrer,
          userAgent: req.headers["user-agent"],
        }));
      } catch {
        // Malformed report — still return 204 to avoid browser console noise.
      }
      return res.status(204).end();
    }
  );
}
