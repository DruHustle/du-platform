import type express from 'express';
import { ArExperienceService } from '../services/arExperienceService';
import { ok, error } from '../../../../lib/responseFormatter';

export class ArController {
  constructor(private readonly service = new ArExperienceService()) {}

  metadata = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.getExperienceMetadata({
        sessionId: String(req.query.sessionId ?? 'anonymous'),
        userId: Number(req.auth?.userId ?? 0) || undefined,
      });
      return res.json(ok(result));
    } catch (err) {
      return res.status(500).json(error('AI_AR_FAILED', err instanceof Error ? err.message : 'AR metadata failed.'));
    }
  };
}
