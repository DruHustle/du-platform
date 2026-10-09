import { Router } from 'express';
import { ArController } from '../controllers/arController';

export function createAiArRouter() {
  const router = Router();
  const controller = new ArController();
  router.get('/', controller.metadata);
  return router;
}
