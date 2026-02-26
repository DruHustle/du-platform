import type express from "express";
import {
  createRemittanceTransactionRecord,
  getRemittanceTransactionByIdempotencyKey,
  getRemittanceTransactionById,
  getUserFinancialProfile,
} from "../db";
import { TerraPayProvider } from "../providers/terrapayProvider";
import { TerrapayService } from "../services/terrapayService";
import { errorResponse, successResponse, SYSTEM_COMPLIANCE_NOTICE } from "../utils/apiResponse";
import { logFailedFinancialAttempt } from "../utils/failedAttemptLogger";
import { sanitizeText } from "../utils/sanitize";

const terrapayService = new TerrapayService(new TerraPayProvider());

function resolveRequestIp(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown")
    .split(",")[0]
    .trim();
}

function normalizeRemittanceStatus(input: unknown): "pending" | "processing" | "completed" | "failed" {
  const raw = String(input ?? "").trim().toLowerCase();
  if (["completed", "success", "succeeded"].includes(raw)) return "completed";
  if (["failed", "declined", "rejected", "error"].includes(raw)) return "failed";
  if (["processing", "in_progress", "submitted"].includes(raw)) return "processing";
  return "pending";
}

export async function getCashPickupChannels(_req: express.Request, res: express.Response) {
  return res.json(
    successResponse({
      channels: terrapayService.getSupportedCashPickupChannels(),
      systemNotice: SYSTEM_COMPLIANCE_NOTICE,
    })
  );
}

export async function previewFxQuote(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;

  try {
    const preview = await terrapayService.previewFxQuote(req.body);
    return res.json(
      successResponse({
        fxQuote: preview.quote,
        idempotencyKey: preview.idempotencyKey,
        request: preview.normalizedRequest,
        systemNotice: SYSTEM_COMPLIANCE_NOTICE,
      })
    );
  } catch (error) {
    await logFailedFinancialAttempt({
      flow: "remittance",
      endpoint: req.originalUrl,
      reason: error instanceof Error ? error.message : "FX quote request failed",
      userId,
      ip: resolveRequestIp(req),
      payload: req.body,
    });

    const message = error instanceof Error ? error.message : "Unable to fetch FX quote.";
    return res.status(400).json(errorResponse("FX_QUOTE_FAILED", message));
  }
}

export async function sendMoney(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  try {
    const user = await getUserFinancialProfile(userId);
    if (!user) {
      return res.status(404).json(errorResponse("USER_NOT_FOUND", "User account does not exist."));
    }
    if (!user.kyc_verified) {
      return res.status(403).json(errorResponse("KYC_REQUIRED", "KYC verification is required for remittance."));
    }

    const idempotencyHeaderKey = sanitizeText(req.headers["x-idempotency-key"], 64);
    if (idempotencyHeaderKey) {
      const existing = await getRemittanceTransactionByIdempotencyKey(userId, idempotencyHeaderKey);
      if (existing) {
        return res.status(200).json(
          successResponse({
            transaction: existing,
            providerResponse: null,
            idempotentReplay: true,
            systemNotice: SYSTEM_COMPLIANCE_NOTICE,
          })
        );
      }
    }

    const result = await terrapayService.sendMoney({
      ...(req.body ?? {}),
      idempotencyKey: sanitizeText(
        (req.body as Record<string, unknown> | null)?.idempotencyKey ?? idempotencyHeaderKey,
        64
      ) || undefined,
    });
    const status = normalizeRemittanceStatus(result.transfer?.status);

    const saved = await createRemittanceTransactionRecord({
      userId,
      recipientName: result.request.recipientName,
      recipientType: result.request.recipientType,
      provider: result.request.provider ?? "TerraPay",
      payoutChannel: result.request.payoutChannel ?? null,
      amountSent: result.request.amountSent,
      amountReceived: Number(result.transfer?.amountReceived ?? result.quote?.receivingAmount ?? 0) || null,
      currencyFrom: result.request.currencyFrom,
      currencyTo: result.request.currencyTo,
      exchangeRate: Number(result.quote?.fxRate ?? result.quote?.exchangeRate ?? 0) || null,
      status,
      terrapayReference: String(result.transfer?.transactionId ?? result.transfer?.reference ?? "").trim() || null,
      idempotencyKey: result.idempotencyKey,
    });

    return res.status(201).json(
      successResponse({
        transaction: saved,
        providerResponse: {
          quote: result.quote,
          beneficiary: result.beneficiary,
          transfer: result.transfer,
        },
        systemNotice: SYSTEM_COMPLIANCE_NOTICE,
      })
    );
  } catch (error) {
    await logFailedFinancialAttempt({
      flow: "remittance",
      endpoint: req.originalUrl,
      reason: error instanceof Error ? error.message : "Remittance failed",
      userId,
      ip: resolveRequestIp(req),
      payload: req.body,
    });

    const message = error instanceof Error ? error.message : "Unable to send money right now.";
    return res.status(400).json(errorResponse("REMITTANCE_FAILED", message));
  }
}

export async function getRemittanceStatus(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  const transactionId = Number(req.params.id);
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return res.status(400).json(errorResponse("INVALID_ID", "Transaction id is invalid."));
  }

  const transaction = await getRemittanceTransactionById(Math.floor(transactionId), userId);
  if (!transaction) {
    return res.status(404).json(errorResponse("NOT_FOUND", "Transaction not found."));
  }

  return res.json(
    successResponse({
      transaction,
      systemNotice: SYSTEM_COMPLIANCE_NOTICE,
    })
  );
}
