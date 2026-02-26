import type express from 'express';
import { VrExperienceService } from '../services/vrExperienceService';
import { ok, error } from '../../../../shared/responseFormatter';

export class VrController {
  constructor(private readonly service = new VrExperienceService()) {}

  metadata = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.getExperienceMetadata({
        sessionId: String(req.query.sessionId ?? 'anonymous'),
        userId: Number(req.auth?.userId ?? 0) || undefined,
      });
      return res.json(ok(result));
    } catch (err) {
      return res.status(500).json(error('AI_VR_FAILED', err instanceof Error ? err.message : 'VR metadata failed.'));
    }
  };
}
