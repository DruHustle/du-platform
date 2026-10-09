import { Router } from 'express';
import { VrController } from '../controllers/vrController';

export function createAiVrRouter() {
  const router = Router();
  const controller = new VrController();
  router.get('/', controller.metadata);
  return router;
}
