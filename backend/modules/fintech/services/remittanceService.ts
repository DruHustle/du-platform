import crypto from 'crypto';
import { UserFacingError } from '../../../core/errorHandler';
import { ThunesService } from './thunesGatewayService';
import { FintechRepository } from '../repositories/fintechRepository';
import { ThunesProvider } from '../providers/thunesGatewayProvider';
import type { FxQuoteDto, RemittanceDto } from '../dto/remittance.dto';
import { TtlCache } from '../../../shared/cache';
import { logger } from '../../../core/logger';

function normalizeStatus(input: unknown): 'pending' | 'processing' | 'completed' | 'failed' {
  const value = String(input ?? '').toLowerCase();
  if (['completed', 'success', 'succeeded', 'paid'].includes(value)) return 'completed';
  if (['failed', 'declined', 'error', 'rejected', 'canceled', 'cancelled'].includes(value)) return 'failed';
  if (['processing', 'in_progress', 'submitted', 'confirmed', 'accepted'].includes(value)) return 'processing';
  return 'pending';
}

export class RemittanceService {
  private readonly service = new ThunesService(new ThunesProvider());
  private readonly quoteCache = new TtlCache<any>(30_000);

  constructor(private readonly repository = new FintechRepository()) {}

  async previewQuote(input: FxQuoteDto) {
    // Hash PII fields (phone numbers, card PAN) so they are not stored in plaintext as cache keys.
    const rawKey = JSON.stringify({
      amountSent: input.amountSent,
      currencyFrom: input.currencyFrom.toUpperCase(),
      currencyTo: input.currencyTo.toUpperCase(),
      receivingCountry: input.receivingCountry.toUpperCase(),
      originCountry: String((input as any)?.originCountry ?? "").toUpperCase(),
      senderMsisdn: String((input as any)?.senderMsisdn ?? "").trim(),
      recipientType: String((input as any)?.recipientType ?? "").trim(),
      recipientMsisdn: String((input as any)?.recipientMsisdn ?? "").trim(),
      recipientPan: String((input as any)?.recipientPan ?? "").replace(/\D/g, ""),
    });
    const cacheKey = crypto.createHash("sha256").update(rawKey).digest("hex");

    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    const result = await this.service.previewFxQuote(input);
    this.quoteCache.set(cacheKey, result);
    return result;
  }

  async send(userId: number, payload: RemittanceDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new UserFacingError('User account does not exist.');
    if (!profile.kyc_verified) throw new UserFacingError('KYC verification is required for remittance.');

    const idempotencyKey = payload.idempotencyKey ?? crypto.randomUUID();

    // Return the existing transaction on retry — prevents duplicate provider charges.
    if (payload.idempotencyKey) {
      const existing = await this.repository.findRemittanceByIdempotencyKey(userId, payload.idempotencyKey);
      if (existing) {
        logger.info("remittance_idempotent_return", { userId, idempotencyKey });
        return { transaction: existing, providerResponse: null };
      }
    }

    logger.info("remittance_initiated", {
      userId,
      recipientType: payload.recipientType,
      amountSent: payload.amountSent,
      currencyFrom: payload.currencyFrom,
      currencyTo: payload.currencyTo,
      idempotencyKey,
    });

    const result = await this.service.sendMoney(
      { ...payload, idempotencyKey },
      profile
    );

    const providerReference =
      String(
        result.transfer?.id ??
          result.transfer?.transaction_id ??
          result.transfer?.transactionId ??
          result.transfer?.reference ??
          ''
      ).trim() || null;

    const saved = await this.repository.saveRemittance({
      userId,
      recipientName: result.request.recipientName,
      recipientType: result.request.recipientType,
      provider: result.request.provider ?? 'Thunes',
      payoutChannel: result.request.payoutChannel ?? null,
      amountSent: result.request.amountSent,
      amountReceived:
        Number(
          result.transfer?.destination?.amount ??
            result.transfer?.received_amount?.amount ??
            result.transfer?.amountReceived ??
            result.quote?.receivingAmount ??
            result.quote?.destination?.amount ??
            0
        ) || null,
      currencyFrom: result.request.currencyFrom,
      currencyTo: result.request.currencyTo,
      exchangeRate: Number(result.quote?.fxRate ?? result.quote?.exchangeRate ?? 0) || null,
      status: normalizeStatus(result.transfer?.status),
      providerReference,
      idempotencyKey,
    });

    logger.info("remittance_saved", {
      userId,
      transactionId: (saved as any)?.id,
      status: (saved as any)?.status,
      providerReference,
      idempotencyKey,
    });

    return {
      transaction: saved,
      providerResponse: {
        quote: result.quote,
        transaction: result.transaction,
        transfer: result.transfer,
      },
    };
  }

  async getStatus(userId: number, transactionId: number) {
    return this.repository.findRemittance(transactionId, userId);
  }
}
