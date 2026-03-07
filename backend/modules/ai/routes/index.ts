import type express from "express";
import { Router } from 'express';
import { createAiArRouter } from '../ar/routes';
import { createAiVrRouter } from '../vr/routes';
import { AiModuleService } from '../services/aiModuleService';
import { ok } from '../../../shared/responseFormatter';
import { registerOnesaAIRoutes } from '../runtime/onesaRoutes';
import { getOnesaRouteDeps } from '../runtime/onesaRuntime';
import { registerSpeechRoutes, registerTtsRoutes, registerWhisperRoutes } from "../runtime/speechRoutes";

export function createAiModuleRouter() {
  const router = Router();
  const moduleService = new AiModuleService();

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
