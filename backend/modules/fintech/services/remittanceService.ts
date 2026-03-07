import crypto from 'crypto';
import { TerrapayService } from './terrapayGatewayService';
import { FintechRepository } from '../repositories/fintechRepository';
import { TerraPayProvider } from '../providers/terrapayGatewayProvider';
import type { FxQuoteDto, RemittanceDto } from '../dto/remittance.dto';
import { TtlCache } from '../../../shared/cache';

function normalizeStatus(input: unknown): 'pending' | 'processing' | 'completed' | 'failed' {
  const value = String(input ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded'].includes(value)) return 'completed';
  if (['failed', 'declined', 'error', 'rejected'].includes(value)) return 'failed';
  if (['processing', 'in_progress', 'submitted'].includes(value)) return 'processing';
  return 'pending';
}

export class RemittanceService {
  private readonly service = new TerrapayService(new TerraPayProvider());
  private readonly quoteCache = new TtlCache<any>(30_000);

  constructor(private readonly repository = new FintechRepository()) {}

  async previewQuote(input: FxQuoteDto) {
    const cacheKey = JSON.stringify({
      amountSent: input.amountSent,
      currencyFrom: input.currencyFrom.toUpperCase(),
      currencyTo: input.currencyTo.toUpperCase(),
      receivingCountry: input.receivingCountry.toUpperCase(),
    });

    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    const result = await this.service.previewFxQuote(input);
    this.quoteCache.set(cacheKey, result);
    return result;
  }

  async send(userId: number, payload: RemittanceDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new Error('User account does not exist.');
    if (!profile.kyc_verified) throw new Error('KYC verification is required for remittance.');

    const result = await this.service.sendMoney({
      ...payload,
      idempotencyKey: payload.idempotencyKey ?? crypto.randomUUID(),
    });

    const saved = await this.repository.saveRemittance({
      userId,
      recipientName: result.request.recipientName,
      recipientType: result.request.recipientType,
      provider: result.request.provider ?? 'TerraPay',
      payoutChannel: result.request.payoutChannel ?? null,
      amountSent: result.request.amountSent,
      amountReceived: Number(result.transfer?.amountReceived ?? result.quote?.receivingAmount ?? 0) || null,
      currencyFrom: result.request.currencyFrom,
      currencyTo: result.request.currencyTo,
      exchangeRate: Number(result.quote?.fxRate ?? result.quote?.exchangeRate ?? 0) || null,
      status: normalizeStatus(result.transfer?.status),
      terrapayReference: String(result.transfer?.transactionId ?? result.transfer?.reference ?? '').trim() || null,
      idempotencyKey: result.idempotencyKey,
    });

    return {
      transaction: saved,
      providerResponse: {
        quote: result.quote,
        beneficiary: result.beneficiary,
        transfer: result.transfer,
      },
    };
  }

  async getStatus(userId: number, transactionId: number) {
    return this.repository.findRemittance(transactionId, userId);
  }
}
