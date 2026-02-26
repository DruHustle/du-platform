import crypto from 'crypto';
import { ReloadlyService } from '../../../services/reloadlyService';
import { FintechRepository } from '../repositories/fintechRepository';
import { ReloadlyProviderAdapter } from '../providers/reloadlyProvider';
import type { AirtimeLookupDto, AirtimeTopupDto } from '../dto/airtime.dto';

function normalizeStatus(input: unknown): 'pending' | 'completed' | 'failed' {
  const value = String(input ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(value)) return 'completed';
  if (['failed', 'declined', 'error', 'rejected'].includes(value)) return 'failed';
  return 'pending';
}

export class AirtimeService {
  private readonly service = new ReloadlyService(new ReloadlyProviderAdapter() as any);

  constructor(private readonly repository = new FintechRepository()) {}

  async detectOperator(_userId: number, payload: AirtimeLookupDto) {
    return this.service.detectOperator(payload.phoneNumber);
  }

  async getOptions(_userId: number, payload: AirtimeLookupDto) {
    return this.service.fetchTopupOptions(payload.phoneNumber);
  }

  async topup(userId: number, payload: AirtimeTopupDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new Error('User account does not exist.');

    const result = await this.service.createTopup({
      ...payload,
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
    });

    const saved = await this.repository.saveAirtime({
      userId,
      phoneNumber: result.normalizedPhone,
      operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
      amount: result.request.amount,
      currency: result.request.currency ?? 'USD',
      reloadlyReference: String(result.topup?.transactionId ?? result.reference).trim() || null,
      status: normalizeStatus(result.topup?.status),
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
