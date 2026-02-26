import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { validateChatRequest } from '../../validators';

export function createAiChatRouter() {
  const router = Router();
  const controller = new ChatController();
  router.post('/', validateChatRequest, controller.chat);
  return router;
}
