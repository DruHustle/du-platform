import crypto from 'crypto';
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
    if (!profile) throw new Error('User account does not exist.');

    const result = await this.service.createElectricityPayment({
      ...payload,
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
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
      status: normalizeStatus(result.payment?.status),
    });

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
