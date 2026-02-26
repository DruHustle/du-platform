import type express from 'express';
import { ChatService } from '../services/chatService';
import { ok, error } from '../../../../shared/responseFormatter';

export class ChatController {
  constructor(private readonly service = new ChatService()) {}

  chat = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.respond({
        sessionId: String(req.body.sessionId),
        message: String(req.body.message),
        userId: Number(req.auth?.userId ?? 0) || undefined,
      });
      return res.json(ok(result));
    } catch (err) {
      return res.status(500).json(error('AI_CHAT_FAILED', err instanceof Error ? err.message : 'AI chat failed.'));
    }
  };
}
