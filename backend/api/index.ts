import type express from "express";
import { registerBackendApiRoutes } from "./backend";
import { registerOnesaApiRoutes } from "./onesa";
import type { OnesaApiDeps } from "./onesa";
import { registerSpeechRoutes, registerWhisperRoutes, registerTtsRoutes } from "./speech";

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

  // Audio routes:
  // - POST /api/whisper
  // - POST /api/tts
  // - POST /api/speech
  registerWhisperRoutes(app);
  registerTtsRoutes(app);
  registerSpeechRoutes(app);

  // Onesa AI routes (registered from onesaAI.ts), including:
  // - POST /api/onesa/chat
  // - POST /api/onesa/trip-plan
  // - GET /api/onesa/health
  // - GET /api/onesa/ready
  // - POST /api/generate-world
  registerOnesaApiRoutes(app, deps.onesa);
}
