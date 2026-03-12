import crypto from 'crypto';
import { UserFacingError } from '../../../core/errorHandler';
import { logger } from '../../../core/logger';
import { FintechRepository } from '../repositories/fintechRepository';
import { ReloadlyProvider } from '../providers/reloadlyGatewayProvider';
import { ReloadlyService } from './reloadlyGatewayService';
import type { ElectricityOptionsDto, ElectricityPaymentDto } from '../dto/utility.dto';

function normalizeStatus(input: unknown): 'pending' | 'completed' | 'failed' {
  const value = String(input ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(value)) return 'completed';
  if (['failed', 'declined', 'error', 'rejected'].includes(value)) return 'failed';
  return 'pending';
}

export class UtilityService {
  private readonly service = new ReloadlyService(new ReloadlyProvider());

  constructor(private readonly repository = new FintechRepository()) {}

  async electricityOptions(_userId: number, payload: ElectricityOptionsDto) {
    return this.service.fetchElectricityBillers(payload.countryISOCode);
  }

  async payElectricity(userId: number, payload: ElectricityPaymentDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new UserFacingError('User account does not exist.');

    const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();

    // Return the existing transaction on retry — prevents double-charging.
    if (payload.idempotencyKey) {
      const existing = await this.repository.findUtilityByIdempotencyKey(userId, payload.idempotencyKey);
      if (existing) {
        logger.info("utility_payment_idempotent_return", { userId, idempotencyKey });
        return { transaction: existing, providerResponse: null };
      }
    }

    logger.info("utility_payment_initiated", { userId, amount: payload.amount, idempotencyKey });

    const result = await this.service.createElectricityPayment({
      ...payload,
      idempotencyKey,
    });

    const saved = await this.repository.saveUtility({
      userId,
      meterNumber: result.request.meterNumber,
      customerName: result.request.customerName ?? null,
      billerId: String(result.biller?.id ?? result.request.billerId ?? '').trim() || null,
      billerName: String(result.biller?.name ?? '').trim() || null,
      amount: result.request.amount,
      currency: result.request.currency ?? 'USD',
      reloadlyReference: String(result.payment?.transactionId ?? result.payment?.referenceId ?? result.reference).trim() || null,
      tokenCode: String(result.payment?.token ?? result.payment?.tokenCode ?? '').trim() || null,
      idempotencyKey,
      status: normalizeStatus(result.payment?.status),
    });

    logger.info("utility_payment_saved", { userId, transactionId: (saved as any)?.id, idempotencyKey });

    return {
      transaction: saved,
      providerResponse: {
        biller: result.biller,
        payment: result.payment,
      },
    };
  }

  async getElectricityStatus(userId: number, transactionId: number) {
    return this.repository.findUtility(transactionId, userId);
  }
}
