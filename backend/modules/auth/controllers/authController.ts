import type express from 'express';
import { AuthRegistrationError, AuthService } from '../services/authService';
import { ok, error } from '../../../shared/responseFormatter';

export class AuthController {
  constructor(private readonly service = new AuthService()) {}

  register = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.register(req.body);
      return res.status(201).json(ok(result));
    } catch (err) {
      if (err instanceof AuthRegistrationError) {
        return res.status(err.status).json(error(err.code, err.message));
      }
      return res.status(500).json(error('AUTH_REGISTER_FAILED', 'Register failed.'));
    }
  };
}
