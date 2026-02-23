import type express from "express";
import { registerBackendApiRoutes } from "./backend";
import { registerOnesaApiRoutes } from "./onesa";
import type { OnesaApiDeps } from "./onesa";

type ApiDeps = {
  onesa: OnesaApiDeps;
  backend: {
    getEconomicStats: () => Promise<any>;
    db: Parameters<typeof registerBackendApiRoutes>[1]["db"];
    serverStartedAt: number;
  };
};

export function registerApiRoutes(app: express.Express, deps: ApiDeps) {
  // System routes:
  // - GET /api/economic-stats
  // - GET /api/health/db
  // - GET /api/ping
  registerBackendApiRoutes(app, deps.backend);

  // Onesa AI routes (registered from onesaAI.ts), including:
  // - POST /api/onesa/chat
  // - POST /api/onesa/trip-plan
  // - GET /api/onesa/health
  // - GET /api/onesa/ready
  // - POST /api/generate-world
  registerOnesaApiRoutes(app, deps.onesa);
}
