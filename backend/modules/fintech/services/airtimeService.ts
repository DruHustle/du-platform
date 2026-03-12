import crypto from 'crypto';
import { UserFacingError } from '../../../core/errorHandler';
import { ReloadlyService } from './reloadlyGatewayService';
import { FintechRepository } from '../repositories/fintechRepository';
import { ReloadlyProvider } from '../providers/reloadlyGatewayProvider';
import type { AirtimeLookupDto, AirtimeTopupDto } from '../dto/airtime.dto';
import { logger } from '../../../core/logger';

function normalizeStatus(input: unknown): 'pending' | 'completed' | 'failed' {
  const value = String(input ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(value)) return 'completed';
  if (['failed', 'declined', 'error', 'rejected'].includes(value)) return 'failed';
  return 'pending';
}

export class AirtimeService {
  private readonly service = new ReloadlyService(new ReloadlyProvider());

  constructor(private readonly repository = new FintechRepository()) {}

  async detectOperator(_userId: number, payload: AirtimeLookupDto) {
    return this.service.detectOperator(payload.phoneNumber);
  }

  async getOptions(_userId: number, payload: AirtimeLookupDto) {
    return this.service.fetchTopupOptions(payload.phoneNumber, payload.amount);
  }

  async topup(userId: number, payload: AirtimeTopupDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new UserFacingError('User account does not exist.');

    const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();

    // Check for an existing transaction with this idempotency key before calling the provider.
    // This prevents double-charging on network retries.
    if (payload.idempotencyKey) {
      const existing = await this.repository.findAirtimeByIdempotencyKey(userId, payload.idempotencyKey);
      if (existing) {
        logger.info("airtime_topup_idempotent_return", { userId, idempotencyKey });
        return { transaction: existing, providerResponse: null };
      }
    }

    logger.info("airtime_topup_initiated", {
      userId,
      amount: payload.amount,
      currency: payload.currency,
      idempotencyKey,
    });

    const result = await this.service.createTopup({
      ...payload,
      idempotencyKey,
    });

    const saved = await this.repository.saveAirtime({
      userId,
      phoneNumber: result.normalizedPhone,
      operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
      amount: result.request.amount,
      currency: result.request.currency ?? 'USD',
      reloadlyReference: String(result.topup?.transactionId ?? result.reference).trim() || null,
      idempotencyKey,
      status: normalizeStatus(result.topup?.status),
    });

    logger.info("airtime_topup_saved", {
      userId,
      transactionId: (saved as any)?.id,
      status: (saved as any)?.status,
      idempotencyKey,
    });

    return {
      transaction: saved,
      providerResponse: {
        operator: result.operator,
        topup: result.topup,
      },
    };
  }

  async getStatus(userId: number, transactionId: number) {
    return this.repository.findAirtime(transactionId, userId);
  }
}
