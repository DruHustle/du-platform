import type express from 'express';
import { UserFacingError } from '../../../core/errorHandler';
import { AirtimeService } from '../services/airtimeService';
import { ok, error } from '../../../shared/responseFormatter';
import { logger } from '../../../core/logger';

function toClientMessage(err: unknown, fallback: string): string {
  if (err instanceof UserFacingError) return err.message;
  logger.error('airtime_controller_error', { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  return fallback;
}

const SYSTEM_NOTICE = 'Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.';

export class AirtimeController {
  constructor(private readonly service = new AirtimeService()) {}

  detectOperator = async (req: express.Request, res: express.Response) => {
    try {
      const operator = await this.service.detectOperator(Number(req.auth?.userId ?? 0), req.body);
      return res.json(ok({ operator, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('OPERATOR_DETECTION_FAILED', toClientMessage(err, 'Operator detection failed.')));
    }
  };

  options = async (req: express.Request, res: express.Response) => {
    try {
      const result = await this.service.getOptions(Number(req.auth?.userId ?? 0), req.body);
      return res.json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('TOPUP_OPTIONS_FAILED', toClientMessage(err, 'Failed to retrieve top-up options.')));
    }
  };

  topup = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));

    try {
      const result = await this.service.topup(userId, req.body);
      return res.status(201).json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('AIRTIME_TOPUP_FAILED', toClientMessage(err, 'Top-up could not be processed.')));
    }
  };

  getStatus = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    const transactionId = Number(req.params.id);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));
    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      return res.status(400).json(error('INVALID_ID', 'Invalid transaction id.'));
    }

    try {
      const transaction = await this.service.getStatus(userId, Math.floor(transactionId));
      if (!transaction) return res.status(404).json(error('NOT_FOUND', 'Transaction not found.'));
      return res.json(ok({ transaction, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(500).json(error('AIRTIME_STATUS_FAILED', toClientMessage(err, 'Unable to retrieve transaction status.')));
    }
  };
}
