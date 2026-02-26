import type express from 'express';
import { AuthService } from '../services/authService';
import { ok, error } from '../../../shared/responseFormatter';

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  register = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.register(req.body);
      return res.status(201).json(ok(result));
    } catch (err) {
      return res.status(400).json(error('AUTH_REGISTER_FAILED', err instanceof Error ? err.message : 'Register failed.'));
    }
  };
}
