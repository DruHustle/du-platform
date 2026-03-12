import type express from 'express';
import { UserFacingError } from '../../../core/errorHandler';
import { logger } from '../../../core/logger';
import { RemittanceService } from '../services/remittanceService';
import { ok, error } from '../../../shared/responseFormatter';

function toClientMessage(err: unknown, fallback: string): string {
  if (err instanceof UserFacingError) return err.message;
  logger.error('remittance_controller_error', { message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  return fallback;
}

const SYSTEM_NOTICE = 'Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.';

export class RemittanceController {
  constructor(private readonly service = new RemittanceService()) {}

  previewQuote = async (req: express.Request, res: express.Response) => {
    try {
      const quote = await this.service.previewQuote(req.body);
      return res.json(ok({ ...quote, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('FX_QUOTE_FAILED', toClientMessage(err, 'Unable to retrieve FX quote.')));
    }
  };

  send = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error('UNAUTHORIZED', 'Authentication required.'));

    try {
      const result = await this.service.send(userId, req.body);
      return res.status(201).json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res.status(400).json(error('REMITTANCE_FAILED', toClientMessage(err, 'Remittance could not be processed.')));
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
      return res.status(500).json(error('REMITTANCE_STATUS_FAILED', toClientMessage(err, 'Unable to retrieve transaction status.')));
    }
  };
}
