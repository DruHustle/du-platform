import type express from "express";
import { registerBackendApiRoutes } from "./backend";

type ApiDeps = {
  backend: {
    db: Parameters<typeof registerBackendApiRoutes>[1]["db"];
    serverStartedAt: number;
  };
};

export function registerApiRoutes(app: express.Express, deps: ApiDeps) {
  // System routes:
  // - GET /api/health/db
  // - GET /api/ping
  registerBackendApiRoutes(app, deps.backend);
}
