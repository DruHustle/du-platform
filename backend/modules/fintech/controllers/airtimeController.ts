import type express from 'express';
import { AirtimeService } from '../services/airtimeService';
import { ok, error } from '../../../shared/responseFormatter';

const SYSTEM_NOTICE = 'Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.';

export class AirtimeController {
  constructor(private readonly service = new AirtimeService()) {}

  detectOperator = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));

    try {
      const operator = await this.service.detectOperator(userId, req.body);
      return res.json(ok({ operator, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('OPERATOR_DETECTION_FAILED', err instanceof Error ? err.message : 'Operator detection failed.'));
    }
  };

  options = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));

    try {
      const result = await this.service.getOptions(userId, req.body);
      return res.json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('TOPUP_OPTIONS_FAILED', err instanceof Error ? err.message : 'Options failed.'));
    }
  };

  topup = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));

    try {
      const result = await this.service.topup(userId, req.body);
      return res.status(201).json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('AIRTIME_TOPUP_FAILED', err instanceof Error ? err.message : 'Topup failed.'));
    }
  };

  getStatus = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    const transactionId = Number(req.params.id);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));
    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      return res.status(400).json(error('INVALID_ID', 'Invalid transaction id.'));
    }

    const transaction = await this.service.getStatus(userId, Math.floor(transactionId));
    if (!transaction) return res.status(404).json(error('NOT_FOUND', 'Transaction not found.'));

    return res.json(ok({ transaction, systemNotice: SYSTEM_NOTICE }));
  };
}
