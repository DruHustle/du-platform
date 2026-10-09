import { appendAuditEvent } from '../../../core/auditLogger';
import { UserFacingError } from '../../../core/errorHandler';
import { FintechRepository } from '../repositories/fintechRepository';
import type { AirtimeLookupDto, AirtimeTopupDto } from '../dto/airtime.dto';
import { logger } from '../../../core/logger';
import type { AirtimeFeatureProvider } from '../providers/providerTypes';
import { appendFintechRecoveryRecord } from './fintechRecoveryQueue';
import { sendFintechCompletionEmailSafe } from '../../../shared/email';

// Use exact-match sets rather than substring matching to prevent ambiguous
// overlaps (e.g. "error_processing" must not match both "error" and "processing").
const AIRTIME_COMPLETED = new Set(['completed', 'success', 'succeeded', 'topup_completed']);
const AIRTIME_FAILED = new Set(['failed', 'declined', 'error', 'rejected', 'cancelled', 'canceled']);

function normalizeStatus(input: unknown): 'pending' | 'completed' | 'failed' {
  const lower = String(input ?? '').trim().toLowerCase();
  if (AIRTIME_COMPLETED.has(lower)) return 'completed';
  if (AIRTIME_FAILED.has(lower)) return 'failed';
  return 'pending';
}

function extractWebhookProviderReference(payload: any): string {
  return String(
    payload?.providerReference ??
      payload?.transactionId ??
      payload?.reference ??
      payload?.topup?.transactionId ??
      payload?.topup?.reference ??
      payload?.data?.transactionId ??
      payload?.data?.reference ??
      ''
  ).trim();
}

function extractWebhookStatus(payload: any): string {
  return String(
    payload?.status ??
      payload?.topup?.status ??
      payload?.data?.status ??
      ''
  ).trim();
}

export class AirtimeService {
  constructor(
    private readonly provider: AirtimeFeatureProvider,
    private readonly repository = new FintechRepository()
  ) {}

  async detectOperator(_userId: number, payload: AirtimeLookupDto) {
    return this.provider.detectOperator(payload.phoneNumber);
  }

  async getOptions(_userId: number, payload: AirtimeLookupDto) {
    return this.provider.fetchTopupOptions(payload.phoneNumber, payload.amount);
  }

  async topup(userId: number, payload: AirtimeTopupDto) {
    const profile = await this.repository.getFinancialProfile(userId);
    if (!profile) throw new UserFacingError('User account does not exist.');
    // Keep airtime aligned with remittance controls so low-value top-ups do not bypass KYC.
    if (!profile.kyc_verified) throw new UserFacingError('KYC verification is required for airtime top-up.', 403, 'KYC_REQUIRED');

    const idempotencyKey = payload.idempotencyKey;

    // Check for an existing transaction with this idempotency key before calling the provider.
    // This prevents double-charging on network retries.
    const existing = await this.repository.findAirtimeByIdempotencyKey(userId, idempotencyKey);
    if (existing) {
      logger.info("airtime_topup_idempotent_return", { userId, idempotencyKey });
      return { transaction: existing, providerResponse: null };
    }

    logger.info("airtime_topup_initiated", {
      userId,
      amount: payload.amount,
      currency: payload.currency,
      idempotencyKey,
    });

    const result = await this.provider.createTopup({
      ...payload,
      idempotencyKey,
    });

    const providerReference = String(result.topup?.transactionId ?? result.reference).trim() || null;
    let saved: any;
    try {
      saved = await this.repository.saveAirtime({
        userId,
        provider: this.provider.displayName,
        phoneNumber: result.normalizedPhone,
        operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
        amount: Number(result.request.amount ?? payload.amount),
        currency: result.request.currency ?? 'USD',
        providerReference,
        idempotencyKey,
        status: normalizeStatus(result.topup?.status),
      });
    } catch (error) {
      try {
        await appendFintechRecoveryRecord({
        flow: "airtime",
        provider: this.provider.displayName,
        userId,
        idempotencyKey,
        providerReference,
        status: String(result.topup?.status ?? "").trim() || null,
        amount: Number(result.request.amount ?? 0) || null,
        currency: String(result.request.currency ?? "USD").trim() || null,
        recordedAt: new Date().toISOString(),
        reason: error instanceof Error ? error.message : String(error),
        metadata: {
          operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
        },
        });
      } catch (recoveryError) {
        logger.error("fintech_recovery_record_write_failed", {
          flow: "airtime",
          providerReference,
          idempotencyKey,
          reason: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        });
      }
      logger.error("airtime_persistence_failed_after_provider_success", {
        userId,
        providerReference,
        idempotencyKey,
        reason: error instanceof Error ? error.message : String(error),
      });
      await appendAuditEvent({
        actorId: userId,
        domain: 'fintech',
        action: 'airtime_persistence_failed_after_provider_success',
        resource: providerReference ? `airtime:${providerReference}` : `airtime:idempotency:${idempotencyKey}`,
        metadata: {
          provider: this.provider.displayName,
          idempotencyKey,
          operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
          status: String(result.topup?.status ?? '').trim() || null,
        },
      });
      throw new UserFacingError("Top-up was accepted by the provider, but confirmation could not be saved. Support has been alerted.", 503, "AIRTIME_PERSISTENCE_FAILED");
    }

    await appendAuditEvent({
      actorId: userId,
      domain: 'fintech',
      action: 'airtime_created',
      resource: providerReference ? `airtime:${providerReference}` : `airtime:${String((saved as any)?.id ?? idempotencyKey)}`,
      metadata: {
        transactionId: (saved as any)?.id ?? null,
        provider: this.provider.displayName,
        idempotencyKey,
        status: (saved as any)?.status ?? null,
        operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? '').trim() || null,
      },
    });

    logger.info("airtime_topup_saved", {
      userId,
      transactionId: (saved as any)?.id,
      status: (saved as any)?.status,
      idempotencyKey,
    });

    await this.maybeSendCompletionEmail(saved, profile);

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

  async listHistory(userId: number, limit = 20) {
    return this.repository.listAirtimeHistory(userId, limit);
  }

  async applyWebhookStatus(payload: unknown) {
    const providerReference = extractWebhookProviderReference(payload);
    const status = normalizeStatus(extractWebhookStatus(payload));
    if (!providerReference) {
      throw new UserFacingError('Webhook payload is missing a provider reference.');
    }

    const updated = await this.repository.updateAirtimeStatusByProviderReference(providerReference, status);
    if (!updated) {
      throw new UserFacingError('Airtime transaction not found for provider reference.', 404, 'AIRTIME_NOT_FOUND');
    }

    await appendAuditEvent({
      actorId: null,
      domain: 'fintech',
      action: 'airtime_status_updated',
      resource: `airtime:${providerReference}`,
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

  private async maybeSendCompletionEmail(
    transaction: any,
    profile?: { full_name?: string; email?: string } | null
  ) {
    if (String(transaction?.status ?? '').trim().toLowerCase() !== 'completed') return;

    const transactionId = Number(transaction?.id ?? 0);
    if (!Number.isFinite(transactionId) || transactionId <= 0) return;

    const marked = await this.repository.markAirtimeCompletionEmailSent(transactionId);
    if (!marked) return;

    await sendFintechCompletionEmailSafe({
      to: String(profile?.email ?? '').trim(),
      fullName: String(profile?.full_name ?? '').trim() || null,
      flow: 'airtime',
      amount: Number(transaction?.amount ?? 0),
      currency: String(transaction?.currency ?? 'USD').trim().toUpperCase(),
      reference: String(transaction?.provider_reference ?? transaction?.reloadly_reference ?? '').trim() || null,
      recipientLabel: String(transaction?.phone_number ?? '').trim() || 'Zimbabwe mobile line',
      status: String(transaction?.status ?? 'completed'),
      completedAt: String(transaction?.updated_at ?? transaction?.created_at ?? '').trim() || null,
    });
  }
}
