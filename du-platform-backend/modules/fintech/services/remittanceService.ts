import crypto from 'crypto';
import { appendAuditEvent } from '../../../core/auditLogger';
import { UserFacingError } from '../../../core/errorHandler';
import { FintechRepository } from '../repositories/fintechRepository';
import type { FxQuoteDto, RemittanceDto } from '../dto/remittance.dto';
import { TtlCache } from '../../../shared/cache';
import { logger } from '../../../core/logger';
import type { RemittanceFeatureProvider } from '../providers/providerTypes';
import { appendFintechRecoveryRecord } from './fintechRecoveryQueue';
import { getRemittancePolicy } from '../config/remittancePolicy';
import { sendFintechCompletionEmailSafe } from '../../../shared/email';

// Explicit TerraPay numeric status code → canonical status.
// Source: TerraPay API documentation.  Add new codes here as they are documented
// rather than relying on substring matching, which can produce ambiguous results
// (e.g. "error_processing" would match both "error" and "processing").
const TERRAPAY_CODE_STATUS: Record<string, 'pending' | 'processing' | 'completed' | 'failed'> = {
  '3000': 'completed',  // Transaction Paid
  '1000': 'pending',    // Transaction Pending
  '1001': 'failed',     // Transaction Rejected
  '1002': 'failed',     // Transaction Cancelled
  '1003': 'failed',     // Transaction Declined
  '2000': 'processing', // Transaction Submitted / In Progress
  '2001': 'processing', // Transaction Accepted
};

function normalizeStatus(input: unknown): 'pending' | 'processing' | 'completed' | 'failed' {
  const raw = String(input ?? '').trim();

  // Primary: parse TerraPay numeric code prefix, e.g. "3000:Transaction Paid"
  const codeMatch = raw.match(/^(\d+)(?::.*)?$/);
  if (codeMatch) {
    const mapped = TERRAPAY_CODE_STATUS[codeMatch[1]];
    if (mapped) return mapped;
  }

  // Fallback: match exact well-known lowercase values — no substring matching
  // to prevent overlapping keywords (e.g. "error_processing").
  const lower = raw.toLowerCase();
  const COMPLETED_VALUES = new Set(['paid', 'completed', 'success', 'succeeded']);
  const FAILED_VALUES = new Set(['rejected', 'failed', 'declined', 'canceled', 'cancelled', 'error']);
  const PROCESSING_VALUES = new Set(['processing', 'submitted', 'confirmed', 'accepted', 'in_progress', 'in progress']);

  if (COMPLETED_VALUES.has(lower)) return 'completed';
  if (FAILED_VALUES.has(lower)) return 'failed';
  if (PROCESSING_VALUES.has(lower)) return 'processing';
  return 'pending';
}

function extractWebhookProviderReference(payload: any): string {
  return String(
    payload?.providerReference ??
      payload?.transactionId ??
      payload?.reference ??
      payload?.transaction?.transactionId ??
      payload?.transaction?.reference ??
      payload?.data?.transactionId ??
      payload?.data?.reference ??
      ''
  ).trim();
}

function extractWebhookStatus(payload: any): string {
  return String(
    payload?.status ??
      payload?.transactionStatus ??
      payload?.transaction?.status ??
      payload?.transaction?.transactionStatus ??
      payload?.data?.status ??
      payload?.data?.transactionStatus ??
      ''
  ).trim();
}

export class RemittanceService {
  private readonly quoteCache = new TtlCache<any>(30_000);

  constructor(
    private readonly provider: RemittanceFeatureProvider,
    private readonly repository = new FintechRepository()
  ) {}

  private toProviderFacingError(err: unknown): never {
    if (err instanceof UserFacingError) {
      throw err;
    }

    const message = String(err instanceof Error ? err.message : err).trim();
    const normalized = message.toLowerCase();

    if (
      normalized.includes('quote is unavailable') ||
      normalized.includes('unsupported corridor') ||
      normalized.includes('quotation id is missing')
    ) {
      throw new UserFacingError('This payout route is unavailable right now. Check the amount and recipient details, then refresh the quote.', 409, 'QUOTE_UNAVAILABLE');
    }

    if (normalized.includes('expired quote') || normalized.includes('quote expired')) {
      throw new UserFacingError('Your exchange quote has expired. Refresh the quote before paying.', 409, 'QUOTE_EXPIRED');
    }

    if (normalized.includes('bank account number')) {
      throw new UserFacingError(message || 'The bank account details are invalid.', 400, 'INVALID_BANK_ACCOUNT');
    }

    throw err;
  }

  private async enforceCumulativeLimits(userId: number, nextAmount: number) {
    const policy = getRemittancePolicy();
    const now = Date.now();
    const dailyTotal = await this.repository.getRemittanceTotalSince(userId, new Date(now - 24 * 60 * 60 * 1000).toISOString());
    if (dailyTotal + nextAmount > policy.dailyLimit) {
      throw new UserFacingError(`Daily remittance limit reached. Your remaining daily allowance is ${Math.max(0, policy.dailyLimit - dailyTotal).toFixed(2)}.`, 429, 'REMITTANCE_DAILY_LIMIT_REACHED');
    }

    const weeklyTotal = await this.repository.getRemittanceTotalSince(userId, new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (weeklyTotal + nextAmount > policy.weeklyLimit) {
      throw new UserFacingError(`Weekly remittance limit reached. Your remaining weekly allowance is ${Math.max(0, policy.weeklyLimit - weeklyTotal).toFixed(2)}.`, 429, 'REMITTANCE_WEEKLY_LIMIT_REACHED');
    }

    const monthlyTotal = await this.repository.getRemittanceTotalSince(userId, new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());
    if (monthlyTotal + nextAmount > policy.monthlyLimit) {
      throw new UserFacingError(`Monthly remittance limit reached. Your remaining monthly allowance is ${Math.max(0, policy.monthlyLimit - monthlyTotal).toFixed(2)}.`, 429, 'REMITTANCE_MONTHLY_LIMIT_REACHED');
    }
  }

  private async tryPersistRecoveryRecord(input: Parameters<typeof appendFintechRecoveryRecord>[0]) {
    try {
      await appendFintechRecoveryRecord(input);
    } catch (recoveryError) {
      logger.error('fintech_recovery_record_write_failed', {
        flow: input.flow,
        providerReference: input.providerReference,
        idempotencyKey: input.idempotencyKey,
        reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      });
    }
  }

  private async maybeSendCompletionEmail(
    transaction: any,
    profile?: { full_name?: string; email?: string } | null
  ) {
    if (String(transaction?.status ?? '').trim().toLowerCase() !== 'completed') return;

    const transactionId = Number(transaction?.id ?? 0);
    if (!Number.isFinite(transactionId) || transactionId <= 0) return;

    const marked = await this.repository.markRemittanceCompletionEmailSent(transactionId);
    if (!marked) return;

    const recipientName = String(transaction?.recipient_name ?? '').trim() || 'Recipient';
    const amount = Number(transaction?.amount_sent ?? 0);
    const currency = String(transaction?.currency_from ?? '').trim().toUpperCase() || 'EUR';
    const reference = String(transaction?.provider_reference ?? '').trim() || null;
    const completedAt = String(transaction?.updated_at ?? transaction?.created_at ?? '').trim() || null;

    await sendFintechCompletionEmailSafe({
      to: String(profile?.email ?? '').trim(),
      fullName: String(profile?.full_name ?? '').trim() || null,
      flow: 'remittance',
      amount,
      currency,
      reference,
      recipientLabel: `${recipientName} (${String(transaction?.recipient_type ?? '').trim() || 'remittance'})`,
      status: String(transaction?.status ?? 'completed'),
      completedAt,
    });
  }

  async previewQuote(input: FxQuoteDto) {
    // Hash PII fields so they are not stored in plaintext as cache keys.
    const rawKey = JSON.stringify({
      amountSent: input.amountSent,
      currencyFrom: input.currencyFrom.toUpperCase(),
      currencyTo: input.currencyTo.toUpperCase(),
      receivingCountry: input.receivingCountry.toUpperCase(),
      originCountry: String((input as any)?.originCountry ?? '').toUpperCase(),
      senderMsisdn: String((input as any)?.senderMsisdn ?? '').trim(),
      recipientType: String((input as any)?.recipientType ?? '').trim(),
      recipientMsisdn: String((input as any)?.recipientMsisdn ?? '').trim(),
      recipientBankName: String((input as any)?.recipientBankName ?? '').trim(),
      recipientBankAccountNumber: String((input as any)?.recipientBankAccountNumber ?? '').trim(),
      recipientPan: String((input as any)?.recipientPan ?? '').replace(/\D/g, ''),
    });
    const cacheKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    const cached = this.quoteCache.get(cacheKey);
    if (cached) return cached;

    let result: any;
    try {
      result = await this.provider.previewQuote(input);
    } catch (err) {
      this.toProviderFacingError(err);
    }
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
        logger.info('remittance_idempotent_return', { userId, idempotencyKey });
        return { transaction: existing, providerResponse: null };
      }
    }

    await this.enforceCumulativeLimits(userId, Number(payload.amountSent ?? 0));

    logger.info('remittance_initiated', {
      userId,
      recipientType: payload.recipientType,
      amountSent: payload.amountSent,
      currencyFrom: payload.currencyFrom,
      currencyTo: payload.currencyTo,
      idempotencyKey,
    });

    let result: any;
    try {
      result = await this.provider.sendMoney(
        { ...payload, idempotencyKey },
        profile
      );
    } catch (err) {
      this.toProviderFacingError(err);
    }

    // TerraPay returns transactionId and transactionStatus in the transaction response.
    const providerReference =
      String(
        result.transfer?.transactionId ??
          result.transfer?.transaction_id ??
          result.transfer?.reference ??
          ''
      ).trim() || null;

    let saved: any;
    try {
      saved = await this.repository.saveRemittance({
        userId,
        recipientName: result.request.recipientName,
        recipientType: result.request.recipientType,
        provider: result.request.provider ?? this.provider.displayName,
        payoutChannel: result.request.payoutChannel ?? null,
        amountSent: result.request.amountSent,
        amountReceived: (() => { const v = Number(result.quote?.receivingAmount ?? 0); return Number.isFinite(v) && v > 0 ? v : null; })(),
        currencyFrom: result.request.currencyFrom,
        currencyTo: result.request.currencyTo,
        exchangeRate: (() => { const v = Number(result.quote?.fxRate ?? 0); return Number.isFinite(v) && v > 0 ? v : null; })(),
        status: normalizeStatus(result.transfer?.transactionStatus),
        providerReference,
        idempotencyKey,
      });
    } catch (error) {
      await this.tryPersistRecoveryRecord({
        flow: "remittance",
        provider: result.request.provider ?? this.provider.displayName,
        userId,
        idempotencyKey,
        providerReference,
        status: String(result.transfer?.transactionStatus ?? "").trim() || null,
        amount: Number(result.request.amountSent ?? 0) || null,
        currency: String(result.request.currencyFrom ?? "").trim() || null,
        recordedAt: new Date().toISOString(),
        reason: error instanceof Error ? error.message : String(error),
        metadata: {
          recipientType: result.request.recipientType,
        },
      });
      logger.error('remittance_persistence_failed_after_provider_success', {
        userId,
        providerReference,
        idempotencyKey,
        reason: error instanceof Error ? error.message : String(error),
      });
      await appendAuditEvent({
        actorId: userId,
        domain: 'fintech',
        action: 'remittance_persistence_failed_after_provider_success',
        resource: providerReference ? `remittance:${providerReference}` : `remittance:idempotency:${idempotencyKey}`,
        metadata: {
          provider: result.request.provider ?? this.provider.displayName,
          idempotencyKey,
          recipientType: result.request.recipientType,
          status: String(result.transfer?.transactionStatus ?? '').trim() || null,
        },
      });
      throw new UserFacingError('Transfer was accepted by the provider, but confirmation could not be saved. Support has been alerted.', 503, 'REMITTANCE_PERSISTENCE_FAILED');
    }

    await appendAuditEvent({
      actorId: userId,
      domain: 'fintech',
      action: 'remittance_created',
      resource: providerReference ? `remittance:${providerReference}` : `remittance:${String((saved as any)?.id ?? idempotencyKey)}`,
      metadata: {
        transactionId: (saved as any)?.id ?? null,
        provider: result.request.provider ?? this.provider.displayName,
        idempotencyKey,
        status: (saved as any)?.status ?? null,
        recipientType: result.request.recipientType,
      },
    });

    logger.info('remittance_saved', {
      userId,
      transactionId: (saved as any)?.id,
      status: (saved as any)?.status,
      providerReference,
      idempotencyKey,
    });

    await this.maybeSendCompletionEmail(saved, profile);

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

  async listHistory(userId: number, limit = 20) {
    return this.repository.listRemittanceHistory(userId, limit);
  }

  async applyWebhookStatus(payload: unknown) {
    const providerReference = extractWebhookProviderReference(payload);
    const status = normalizeStatus(extractWebhookStatus(payload));
    if (!providerReference) {
      throw new UserFacingError('Webhook payload is missing a provider reference.');
    }

    const updated = await this.repository.updateRemittanceStatusByProviderReference(providerReference, status);
    if (!updated) {
      throw new UserFacingError('Remittance transaction not found for provider reference.', 404, 'REMITTANCE_NOT_FOUND');
    }

    await appendAuditEvent({
      actorId: null,
      domain: 'fintech',
      action: 'remittance_status_updated',
      resource: `remittance:${providerReference}`,
      metadata: {
        status,
        source: 'webhook',
      },
    });

    if (status === 'completed') {
      const profile = await this.repository.getFinancialProfile(Number((updated as any)?.user_id ?? 0));
      await this.maybeSendCompletionEmail(updated, profile);
    }

    return updated;
  }
}
