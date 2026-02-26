import type express from "express";
import {
  createAirtimeTransactionRecord,
  getAirtimeTransactionById,
  getUserFinancialProfile,
} from "../db";
import { ReloadlyProvider } from "../providers/reloadlyProvider";
import { ReloadlyService } from "../services/reloadlyService";
import { errorResponse, successResponse, SYSTEM_COMPLIANCE_NOTICE } from "../utils/apiResponse";
import { logFailedFinancialAttempt } from "../utils/failedAttemptLogger";
import { sanitizeText } from "../utils/sanitize";

const reloadlyService = new ReloadlyService(new ReloadlyProvider());

function resolveRequestIp(req: express.Request): string {
  return String(req.headers["x-forwarded-for"] ?? req.ip ?? "unknown")
    .split(",")[0]
    .trim();
}

function normalizeAirtimeStatus(input: unknown): "pending" | "completed" | "failed" {
  const raw = String(input ?? "").trim().toLowerCase();
  if (["completed", "success", "succeeded"].includes(raw)) return "completed";
  if (["failed", "declined", "rejected", "error"].includes(raw)) return "failed";
  return "pending";
}

async function ensureUserExists(userId: number) {
  const user = await getUserFinancialProfile(userId);
  if (!user) throw new Error("User account does not exist.");
  return user;
}

export async function detectOperator(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  try {
    await ensureUserExists(userId);
    const phoneNumber = sanitizeText(req.body?.phoneNumber, 20);
    const operator = await reloadlyService.detectOperator(phoneNumber);
    return res.json(
      successResponse({
        operator,
        systemNotice: SYSTEM_COMPLIANCE_NOTICE,
      })
    );
  } catch (error) {
    await logFailedFinancialAttempt({
      flow: "airtime",
      endpoint: req.originalUrl,
      reason: error instanceof Error ? error.message : "Operator detection failed",
      userId,
      ip: resolveRequestIp(req),
      payload: req.body,
    });

    const message = error instanceof Error ? error.message : "Operator detection failed.";
    return res.status(400).json(errorResponse("OPERATOR_DETECTION_FAILED", message));
  }
}

export async function getTopupOptions(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  try {
    await ensureUserExists(userId);
    const phoneNumber = sanitizeText(req.body?.phoneNumber, 20);
    const result = await reloadlyService.fetchTopupOptions(phoneNumber);
    return res.json(
      successResponse({
        operator: result.operator,
        options: result.options,
        systemNotice: SYSTEM_COMPLIANCE_NOTICE,
      })
    );
  } catch (error) {
    await logFailedFinancialAttempt({
      flow: "airtime",
      endpoint: req.originalUrl,
      reason: error instanceof Error ? error.message : "Unable to fetch top-up options",
      userId,
      ip: resolveRequestIp(req),
      payload: req.body,
    });

    const message = error instanceof Error ? error.message : "Unable to fetch top-up options.";
    return res.status(400).json(errorResponse("TOPUP_OPTIONS_FAILED", message));
  }
}

export async function createTopup(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  try {
    await ensureUserExists(userId);
    const result = await reloadlyService.createTopup(req.body);
    const status = normalizeAirtimeStatus(result.topup?.status);

    const saved = await createAirtimeTransactionRecord({
      userId,
      phoneNumber: result.normalizedPhone,
      operatorId: String(result.operator?.operatorId ?? result.operator?.id ?? "").trim() || null,
      amount: result.request.amount,
      currency: result.request.currency ?? "USD",
      reloadlyReference: String(result.topup?.transactionId ?? result.reference).trim() || null,
      status,
    });

    return res.status(201).json(
      successResponse({
        transaction: saved,
        providerResponse: {
          operator: result.operator,
          topup: result.topup,
        },
        systemNotice: SYSTEM_COMPLIANCE_NOTICE,
      })
    );
  } catch (error) {
    await logFailedFinancialAttempt({
      flow: "airtime",
      endpoint: req.originalUrl,
      reason: error instanceof Error ? error.message : "Airtime top-up failed",
      userId,
      ip: resolveRequestIp(req),
      payload: req.body,
    });

    const message = error instanceof Error ? error.message : "Airtime top-up failed.";
    return res.status(400).json(errorResponse("AIRTIME_TOPUP_FAILED", message));
  }
}

export async function getAirtimeStatus(req: express.Request, res: express.Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return res.status(401).json(errorResponse("UNAUTHORIZED", "Authentication is required."));
  }

  const transactionId = Number(req.params.id);
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return res.status(400).json(errorResponse("INVALID_ID", "Transaction id is invalid."));
  }

  const transaction = await getAirtimeTransactionById(Math.floor(transactionId), userId);
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
