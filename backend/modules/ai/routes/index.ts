import { Router } from 'express';
import { createAiChatRouter } from '../chat/routes';
import { createAiBookingRouter } from '../booking/routes';
import { createAiArRouter } from '../ar/routes';
import { createAiVrRouter } from '../vr/routes';
import { AiModuleService } from '../services/aiModuleService';
import { ok } from '../../../shared/responseFormatter';

export function createAiModuleRouter() {
  const router = Router();
  const moduleService = new AiModuleService();

  router.get('/capabilities', (_req, res) => {
    return res.json(ok(moduleService.getCapabilities()));
  });

  router.use('/chat', createAiChatRouter());
  router.use('/book-trip', createAiBookingRouter());
  router.use('/ar', createAiArRouter());
  router.use('/vr', createAiVrRouter());

  return router;
}
