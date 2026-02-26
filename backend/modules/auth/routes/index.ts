import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validateRegister } from '../validators';

export function createAuthModuleRouter() {
  const router = Router();
  const controller = new AuthController();
  router.post('/register', validateRegister, controller.register);
  return router;
}
