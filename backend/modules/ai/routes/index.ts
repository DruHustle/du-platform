import type express from "express";
import { Router } from 'express';
import { createAiArRouter } from '../ar/routes';
import { createAiVrRouter } from '../vr/routes';
import { AiModuleService } from '../services/aiModuleService';
import { ok } from '../../../shared/responseFormatter';
import { registerOnesaAIRoutes } from '../runtime/onesaRoutes';
import { getOnesaRouteDeps } from '../runtime/onesaRuntime';
import { registerSpeechRoutes, registerTtsRoutes, registerWhisperRoutes } from "../runtime/speechRoutes";
import { rateLimiter } from '../../../core/rateLimiter';

export function createAiModuleRouter() {
  const router = Router();
  const moduleService = new AiModuleService();

  // Apply rate limiting to all /api/ai/* routes
  router.use(rateLimiter({ keyPrefix: 'api:ai', windowMs: 60_000, maxRequests: 30 }));

  router.get('/capabilities', (_req, res) => {
    return res.json(ok(moduleService.getCapabilities()));
  });

  registerOnesaAIRoutes(router, getOnesaRouteDeps(), {
    prefix: "",
    worldPath: "/generate-world",
  });
  router.use('/ar', createAiArRouter());
  router.use('/vr', createAiVrRouter());

  return router;
}

export function registerAiModule(app: express.Express) {
  app.use("/api/ai", createAiModuleRouter());
  registerWhisperRoutes(app);
  registerTtsRoutes(app);
  registerSpeechRoutes(app);
}
