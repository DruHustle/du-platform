import crypto from "crypto";
import { z } from "zod";
import {
  TerraPayProvider,
  type TerraPayKvPair,
  type TerraPayQuoteRequest,
  type TerraPayTransactionRequest,
} from "../providers/terrapayGatewayProvider";
import type { FinancialFeature, RemittanceFeatureProvider } from "../providers/providerTypes";
import { sanitizeObject, sanitizePhoneNumber, sanitizeText } from "../../../utils/sanitize";
import { getRemittancePolicy } from "../config/remittancePolicy";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const RemittanceSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  recipientName: z.string().min(2).max(255),
  recipientType: z.enum(["mobile_money", "cash_pickup", "bank_transfer"]),
  provider: z.string().min(2).max(100).optional(),
  payoutChannel: z.string().min(2).max(100).optional(),
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
  originCountry: z.string().min(2).max(2).optional(),
  senderMsisdn: z.string().min(7).max(20).optional(),
  purposeOfRemittance: z.string().min(2).max(255).default("FAMILY_SUPPORT"),
  receivingCountry: z.string().min(2).max(2).default("ZW"),
  quoteId: z.string().min(8).max(64).optional(),
  quoteExpiryTime: z.string().min(8).max(64).optional(),
  quoteToken: z.string().min(32).max(512).optional(),
  quotedFxRate: z.number().positive().optional(),
  quotedReceivingAmount: z.number().positive().optional(),
  quotedReceivingCurrency: z.string().min(3).max(10).optional(),
  quotedSenderFee: z.number().min(0).optional(),
  recipient: z
    .object({
      mobileNumber: z.string().min(7).max(20).optional(),
      cashPickupLocation: z.string().min(2).max(255).optional(),
      bankName: z.string().min(2).max(100).optional(),
      bankAccountNumber: z.string().min(5).max(50).optional(),
      bankCode: z.string().min(4).max(25).optional(),
    })
    .default({}),
});

export type RemittanceRequest = z.infer<typeof RemittanceSchema>;

const QuotePreviewSchema = z.object({
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
  receivingCountry: z.string().min(2).max(2).default("ZW"),
  originCountry: z.string().min(2).max(2).optional(),
  senderMsisdn: z.string().min(7).max(20).optional(),
  recipientType: z.enum(["mobile_money", "cash_pickup", "bank_transfer"]).optional(),
  payoutChannel: z.string().min(2).max(100).optional(),
  recipientMsisdn: z.string().min(7).max(20).optional(),
  recipientBankName: z.string().min(2).max(100).optional(),
  recipientBankAccountNumber: z.string().min(5).max(50).optional(),
});

export type QuotePreviewRequest = z.infer<typeof QuotePreviewSchema>;

export type SenderProfile = {
  full_name?: string;
  email?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format current UTC time as "YYYY-MM-DD HH:mm:ss" */
function formatRequestDate(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}:${p(date.getUTCMinutes())}:${p(date.getUTCSeconds())}`
  );
}

function toFinancialNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const n = Number(input.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function normalizeBankAccountNumber(input: unknown): string {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isValidBankAccountNumber(input: string): boolean {
  return /^[A-Z0-9]{6,20}$/.test(input);
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = sanitizeText(fullName, 255).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

// ─── Quote normalisation ──────────────────────────────────────────────────────

function normalizeQuoteResponse(raw: any) {
  // Pull the first quote from the quotes[] array.
  const first = Array.isArray(raw?.quotes) ? raw.quotes[0] : null;
  if (!first || typeof first !== "object") {
    throw new Error("Quote is unavailable for this payout corridor. Refresh the quote and try again.");
  }
  const fxRate = toFinancialNumber(first?.fxRate ?? raw?.fxRate);
  const sendingAmount = toFinancialNumber(first?.sendingAmount ?? raw?.sendingAmount);
  const receivingAmount = toFinancialNumber(first?.receivingAmount ?? raw?.receivingAmount);
  const sendingCurrency = String(first?.sendingCurrency ?? raw?.sendingCurrency ?? "").toUpperCase();
  const receivingCurrency = String(first?.receivingCurrency ?? raw?.receivingCurrency ?? "").toUpperCase();
  const quoteId = String(first?.quoteId ?? raw?.quotationReference ?? "").trim();
  const quoteExpiryTime = String(first?.quoteExpiryTime ?? raw?.quoteExpiryTime ?? "").trim();

  // Expose senderFee at the top level so extractProviderFee can find it.
  // TerraPay may return it in quotes[0].senderFee, quotes[0].charges.amount, or raw.senderFee.
  const senderFee = toFinancialNumber(
    first?.senderFee ??
    first?.charges?.amount ??
    first?.fees?.sender ??
    raw?.senderFee ??
    raw?.charges?.amount ??
    null
  );

  return {
    ...raw,
    quoteId: quoteId || undefined,
    quoteExpiryTime: quoteExpiryTime || undefined,
    fxRate,
    sendingAmount,
    receivingAmount,
    sendingCurrency,
    receivingCurrency,
    ...(senderFee !== null ? { senderFee } : {}),
  };
}

/**
 * Normalise a phone number to E.164, with special handling for Zimbabwe
 * local format (07xxxxxxxx → +263 7xxxxxxxx).  Applied before fingerprinting
 * so that a quote requested with the local form and a payment submitted with
 * the international form produce the same canonical value.
 */
function normalizeMsisdnForFingerprint(phone: string): string {
  const sanitized = sanitizePhoneNumber(phone); // strips non-digits except leading +
  if (/^07\d{8}$/.test(sanitized)) return `+263${sanitized.slice(1)}`;
  if (/^2637\d{8}$/.test(sanitized)) return `+${sanitized}`;
  return sanitized;
}

function buildQuoteRequestFingerprint(input: {
  amountSent: number;
  currencyFrom: string;
  currencyTo: string;
  receivingCountry: string;
  originCountry?: string;
  senderMsisdn?: string;
  recipientType?: string;
  payoutChannel?: string;
  recipientMsisdn?: string;
  recipientBankName?: string;
  recipientBankAccountNumber?: string;
}) {
  return JSON.stringify({
    amountSent: Number(Number(input.amountSent ?? 0).toFixed(2)),
    currencyFrom: String(input.currencyFrom ?? "").trim().toUpperCase(),
    currencyTo: String(input.currencyTo ?? "").trim().toUpperCase(),
    receivingCountry: String(input.receivingCountry ?? "").trim().toUpperCase(),
    originCountry: String(input.originCountry ?? "").trim().toUpperCase(),
    senderMsisdn: normalizeMsisdnForFingerprint(input.senderMsisdn ?? ""),
    recipientType: String(input.recipientType ?? "").trim().toLowerCase(),
    payoutChannel: String(input.payoutChannel ?? "").trim(),
    recipientMsisdn: normalizeMsisdnForFingerprint(input.recipientMsisdn ?? ""),
    recipientBankName: String(input.recipientBankName ?? "").trim(),
    recipientBankAccountNumber: normalizeBankAccountNumber(input.recipientBankAccountNumber ?? ""),
  });
}

function createQuoteToken(input: {
  quoteId: string;
  quoteExpiryTime?: string;
  fingerprint: string;
  fxRate?: number | null;
  receivingAmount?: number | null;
  receivingCurrency?: string;
  senderFee?: number | null;
}) {
  const canonicalPayload = {
    quoteId: String(input.quoteId ?? "").trim(),
    quoteExpiryTime: String(input.quoteExpiryTime ?? "").trim(),
    fingerprint: String(input.fingerprint ?? ""),
    fxRate: input.fxRate == null ? null : Number(input.fxRate),
    receivingAmount: input.receivingAmount == null ? null : Number(input.receivingAmount),
    receivingCurrency: input.receivingCurrency ? String(input.receivingCurrency).trim().toUpperCase() : null,
    senderFee: input.senderFee == null ? null : Number(input.senderFee),
  };
  const secret = String(process.env.FINTECH_QUOTE_TOKEN_SECRET ?? process.env.JWT_SECRET ?? "du-quote-dev-secret").trim();
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
}

function parseQuoteExpiryTime(input: unknown): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const parsed = Date.parse(raw.replace(" ", "T").replace(/Z?$/, "Z"));
  if (Number.isFinite(parsed)) return parsed;
  const fallback = Date.parse(raw);
  return Number.isFinite(fallback) ? fallback : null;
}

// ─── Credit / debit party builders ───────────────────────────────────────────

function buildInstrumentType(
  recipientType: RemittanceRequest["recipientType"]
): "WALLET" | "BANK_AC" {
  if (recipientType === "mobile_money" || recipientType === "cash_pickup") return "WALLET";
  return "BANK_AC";
}

function buildCreditParty(
  request: RemittanceRequest,
  receivingCountry: string
): TerraPayKvPair[] {
  const instrumentType = buildInstrumentType(request.recipientType);
  const base: TerraPayKvPair[] = [
    { key: "instrumentType", value: instrumentType },
    { key: "receivingCountry", value: receivingCountry.toUpperCase() },
  ];

  if (request.recipientType === "mobile_money" || request.recipientType === "cash_pickup") {
    const msisdn = sanitizePhoneNumber(request.recipient.mobileNumber ?? "");
    if (!msisdn) throw new Error("Recipient mobile number is required for mobile wallet payouts.");
    base.push({ key: "msisdn", value: msisdn });
    return base;
  }

  if (request.recipientType === "bank_transfer") {
    const accountNo = String(request.recipient.bankAccountNumber ?? "").trim();
    if (!accountNo) throw new Error("Bank account number is required for bank transfers.");
    base.push({ key: "bankaccountno", value: accountNo });
    const bankName = String(request.recipient.bankName ?? "").trim();
    if (bankName) base.push({ key: "bankname", value: bankName });
    const bankCode = String(request.recipient.bankCode ?? request.payoutChannel ?? "").trim();
    if (bankCode) base.push({ key: "bankcode", value: bankCode });
    const msisdn = sanitizePhoneNumber(request.recipient.mobileNumber ?? "");
    if (msisdn) base.push({ key: "msisdn", value: msisdn });
    return base;
  }

  throw new Error("Unsupported payout type.");
}

function buildDebitParty(senderMsisdn?: string): TerraPayKvPair[] {
  const msisdn =
    sanitizePhoneNumber(senderMsisdn ?? "") ||
    sanitizePhoneNumber(process.env.TERRAPAY_SENDER_MSISDN ?? "") ||
    "";
  if (!msisdn) return [{ key: "accountId", value: "sender" }];
  return [{ key: "msisdn", value: msisdn }];
}

function buildQuoteCreditParty(request: QuotePreviewRequest): TerraPayKvPair[] {
  const recipientType = request.recipientType ?? "mobile_money";
  const base: TerraPayKvPair[] = [
    { key: "instrumentType", value: recipientType === "bank_transfer" ? "BANK_AC" : "WALLET" },
    { key: "receivingCountry", value: request.receivingCountry.toUpperCase() },
  ];

  if (recipientType === "bank_transfer") {
    const accountNo = String(request.recipientBankAccountNumber ?? "").trim();
    if (accountNo) base.push({ key: "bankaccountno", value: accountNo });
    const bankName = String(request.recipientBankName ?? "").trim();
    if (bankName) base.push({ key: "bankname", value: bankName });
    const bankCode = String(request.payoutChannel ?? "").trim();
    if (bankCode) base.push({ key: "bankcode", value: bankCode });
    return base;
  }

  const msisdn = sanitizePhoneNumber(request.recipientMsisdn ?? "");
  if (msisdn) base.push({ key: "msisdn", value: msisdn });
  return base;
}

// ─── Main service ─────────────────────────────────────────────────────────────

export class TerraPayGatewayService implements RemittanceFeatureProvider {
  readonly providerName = "terrapay";
  readonly displayName = "TerraPay";

  constructor(private readonly provider: TerraPayProvider) {}

  supports(feature: FinancialFeature) {
    return feature === "remittance";
  }

  // ── Input normalisation ──────────────────────────────────────────────────

  private normalize(input: unknown): RemittanceRequest {
    const s = sanitizeObject((input ?? {}) as Record<string, unknown>);
    const parsed = RemittanceSchema.parse({
      ...s,
      idempotencyKey: sanitizeText((s as any)?.idempotencyKey, 64) || undefined,
      recipientName: sanitizeText((s as any)?.recipientName, 255),
      provider: this.displayName,
      payoutChannel: sanitizeText((s as any)?.payoutChannel ?? "", 100) || undefined,
      amountSent: Number((s as any)?.amountSent),
      currencyFrom: sanitizeText((s as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((s as any)?.currencyTo ?? "USD", 10).toUpperCase(),
      originCountry: sanitizeText((s as any)?.originCountry ?? "", 2).toUpperCase() || undefined,
      senderMsisdn: sanitizePhoneNumber((s as any)?.senderMsisdn) || undefined,
      purposeOfRemittance: sanitizeText((s as any)?.purposeOfRemittance ?? "FAMILY_SUPPORT", 255),
      receivingCountry: sanitizeText((s as any)?.receivingCountry ?? "ZW", 2).toUpperCase(),
      recipient: {
        mobileNumber: sanitizePhoneNumber((s as any)?.recipient?.mobileNumber) || undefined,
        cashPickupLocation: sanitizeText((s as any)?.recipient?.cashPickupLocation, 255) || undefined,
        bankName: sanitizeText((s as any)?.recipient?.bankName, 100) || undefined,
        bankAccountNumber: normalizeBankAccountNumber((s as any)?.recipient?.bankAccountNumber) || undefined,
        bankCode: sanitizeText((s as any)?.recipient?.bankCode, 25) || undefined,
      },
      quoteId: sanitizeText((s as any)?.quoteId, 64) || undefined,
      quoteExpiryTime: sanitizeText((s as any)?.quoteExpiryTime, 64) || undefined,
      quoteToken: sanitizeText((s as any)?.quoteToken, 512) || undefined,
      quotedFxRate: toFinancialNumber((s as any)?.quotedFxRate) ?? undefined,
      quotedReceivingAmount: toFinancialNumber((s as any)?.quotedReceivingAmount) ?? undefined,
      quotedReceivingCurrency: sanitizeText((s as any)?.quotedReceivingCurrency ?? "", 10).toUpperCase() || undefined,
      quotedSenderFee: toFinancialNumber((s as any)?.quotedSenderFee) ?? undefined,
    });

    const policy = getRemittancePolicy();
    if (parsed.amountSent > policy.maxPerTransaction) {
      throw new Error(`Amount exceeds permitted limit of ${policy.maxPerTransaction}.`);
    }

    this.validatePayoutDetails(parsed);
    return parsed;
  }

  private normalizeQuotePreview(input: unknown): QuotePreviewRequest {
    const s = sanitizeObject((input ?? {}) as Record<string, unknown>);
    const parsed = QuotePreviewSchema.parse({
      amountSent: Number((s as any)?.amountSent),
      currencyFrom: sanitizeText((s as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((s as any)?.currencyTo ?? "USD", 10).toUpperCase(),
      receivingCountry: sanitizeText((s as any)?.receivingCountry ?? "ZW", 2).toUpperCase(),
      originCountry: sanitizeText((s as any)?.originCountry ?? "", 2).toUpperCase() || undefined,
      senderMsisdn: sanitizePhoneNumber((s as any)?.senderMsisdn) || undefined,
      recipientType: sanitizeText((s as any)?.recipientType ?? "", 32) || undefined,
      payoutChannel: sanitizeText((s as any)?.payoutChannel ?? "", 100) || undefined,
      recipientMsisdn: sanitizePhoneNumber((s as any)?.recipientMsisdn) || undefined,
      recipientBankName: sanitizeText((s as any)?.recipientBankName ?? "", 100) || undefined,
      recipientBankAccountNumber: normalizeBankAccountNumber((s as any)?.recipientBankAccountNumber) || undefined,
    });

    const policy = getRemittancePolicy();
    if (parsed.amountSent > policy.maxPerTransaction) {
      throw new Error(`Amount exceeds permitted limit of ${policy.maxPerTransaction}.`);
    }

    if (
      parsed.recipientType === "bank_transfer" &&
      parsed.recipientBankAccountNumber &&
      !isValidBankAccountNumber(parsed.recipientBankAccountNumber)
    ) {
      throw new Error("Bank account number format is invalid.");
    }

    return parsed;
  }

  // ── Validation ───────────────────────────────────────────────────────────

  private validatePayoutDetails(req: RemittanceRequest): void {
    if (req.recipientType === "mobile_money") {
      if (!req.recipient.mobileNumber) {
        throw new Error("Recipient mobile number is required for mobile money payouts.");
      }
      return;
    }
    if (req.recipientType === "cash_pickup") {
      if (!req.recipient.mobileNumber) {
        throw new Error("Recipient mobile number is required for cash pickup.");
      }
      if (!String(req.recipient.cashPickupLocation ?? "").trim()) {
        throw new Error("Cash pickup location is required for cash pickup.");
      }
      return;
    }
    if (req.recipientType === "bank_transfer") {
      if (!req.recipient.bankAccountNumber) {
        throw new Error("Bank account number is required for bank transfers.");
      }
      if (!isValidBankAccountNumber(req.recipient.bankAccountNumber)) {
        throw new Error("Bank account number format is invalid.");
      }
      const configuredBanks = getRemittancePolicy().supportedBanks;
      const bank = String(req.payoutChannel ?? req.recipient.bankName ?? "").trim();
      if (bank && !configuredBanks.includes(bank)) {
        throw new Error(`Unsupported bank. Allowed: ${configuredBanks.join(", ")}`);
      }
      return;
    }
  }

  // ── Transaction type resolution ──────────────────────────────────────────

  private resolveTransactionType(): "p2p" | "p2b" | "b2p" | "b2b" {
    const raw = String(process.env.TERRAPAY_TRANSACTION_TYPE ?? "").trim().toLowerCase();
    if (!raw) return "p2p";
    if (raw === "p2p" || raw === "p2b" || raw === "b2p" || raw === "b2b") {
      return raw as "p2p" | "p2b" | "b2p" | "b2b";
    }
    throw new Error("TERRAPAY_TRANSACTION_TYPE must be one of p2p, p2b, b2p, b2b.");
  }

  // ── Sender MSISDN resolution ─────────────────────────────────────────────

  private resolveSenderMsisdn(senderMsisdn?: string): string | undefined {
    const fromInput = sanitizePhoneNumber(senderMsisdn ?? "");
    if (fromInput) return fromInput;
    return sanitizePhoneNumber(process.env.TERRAPAY_SENDER_MSISDN ?? "") || undefined;
  }

  // ── Quote preview (unauthenticated fast path for calculator UX) ───────────

  async previewQuote(input: unknown): Promise<any> {
    return this.previewFxQuote(input);
  }

  async previewFxQuote(input: unknown): Promise<any> {
    const payload = this.normalizeQuotePreview(input);
    const idempotencyKey = crypto.randomUUID();
    const type = this.resolveTransactionType();
    const requestDate = formatRequestDate();
    const senderMsisdn = this.resolveSenderMsisdn(payload.senderMsisdn);
    const receiverMsisdn =
      sanitizePhoneNumber(payload.recipientMsisdn ?? "") ||
      String(process.env.TERRAPAY_DEFAULT_BENEFICIARY_MSISDN ?? "").trim() ||
      "";

    const quoteRequest: TerraPayQuoteRequest = {
      requestDate,
      type,
      debitParty: senderMsisdn
        ? [{ key: "msisdn", value: senderMsisdn }]
        : [{ key: "accountId", value: "sender" }],
      creditParty: buildQuoteCreditParty({ ...payload, recipientMsisdn: receiverMsisdn || payload.recipientMsisdn }),
      requestAmount: Number(payload.amountSent).toFixed(2),
      requestCurrency: payload.currencyFrom,
      quotes: [{ sendingCurrency: payload.currencyFrom, receivingCurrency: payload.currencyTo }],
    };

    const quoteRaw = await this.provider.createQuotation(quoteRequest);
    const normalized = normalizeQuoteResponse(quoteRaw);
    const fingerprint = buildQuoteRequestFingerprint({
      amountSent: payload.amountSent,
      currencyFrom: payload.currencyFrom,
      currencyTo: payload.currencyTo,
      receivingCountry: payload.receivingCountry,
      originCountry: payload.originCountry,
      senderMsisdn,
      recipientType: payload.recipientType,
      payoutChannel: payload.payoutChannel,
      recipientMsisdn: payload.recipientMsisdn,
      recipientBankName: payload.recipientBankName,
      recipientBankAccountNumber: payload.recipientBankAccountNumber,
    });
    const quoteToken =
      normalized.quoteId
        ? createQuoteToken({
            quoteId: String(normalized.quoteId),
            quoteExpiryTime: String(normalized.quoteExpiryTime ?? ""),
            fingerprint,
            fxRate: normalized.fxRate,
            receivingAmount: normalized.receivingAmount,
            receivingCurrency: normalized.receivingCurrency || undefined,
            senderFee: normalized.senderFee ?? null,
          })
        : undefined;

    return {
      idempotencyKey,
      quote: normalized,
      fxQuote: normalized,
      normalizedRequest: payload,
      quoteToken,
    };
  }

  // ── Full send money flow ─────────────────────────────────────────────────

  async sendMoney(
    input: unknown,
    senderProfile?: SenderProfile | null
  ): Promise<{
    idempotencyKey: string;
    request: RemittanceRequest;
    quote: any;
    transaction: any;
    transfer: any;
  }> {
    const request = this.normalize(input);
    const idempotencyKey = request.idempotencyKey ?? crypto.randomUUID();
    const type = this.resolveTransactionType();
    const requestDate = formatRequestDate();
    const senderMsisdn = this.resolveSenderMsisdn(request.senderMsisdn);
    const receivingCountry = request.receivingCountry ?? "ZW";
    const quoteFingerprint = buildQuoteRequestFingerprint({
      amountSent: request.amountSent,
      currencyFrom: request.currencyFrom,
      currencyTo: request.currencyTo,
      receivingCountry,
      originCountry: request.originCountry,
      senderMsisdn,
      recipientType: request.recipientType,
      payoutChannel: request.payoutChannel,
      recipientMsisdn: request.recipient.mobileNumber,
      recipientBankName: request.recipient.bankName,
      recipientBankAccountNumber: request.recipient.bankAccountNumber,
    });

    const quoteId = String(request.quoteId ?? "").trim();
    const quoteExpiryTime = String(request.quoteExpiryTime ?? "").trim();
    const quoteToken = String(request.quoteToken ?? "").trim();
    const quotedFxRate = toFinancialNumber(request.quotedFxRate);
    const quotedReceivingAmount = toFinancialNumber(request.quotedReceivingAmount);
    const quotedReceivingCurrency = String(request.quotedReceivingCurrency ?? "").trim().toUpperCase() || undefined;
    const quotedSenderFee = toFinancialNumber(request.quotedSenderFee);

    if (!quoteId || !quoteExpiryTime || !quoteToken || quotedFxRate === null || quotedReceivingAmount === null || !quotedReceivingCurrency) {
      throw new Error("Protected quote details are incomplete. Refresh the quote before paying.");
    }

    const expectedQuoteToken =
      createQuoteToken({
        quoteId,
        quoteExpiryTime,
        fingerprint: quoteFingerprint,
        fxRate: quotedFxRate,
        receivingAmount: quotedReceivingAmount,
        receivingCurrency: quotedReceivingCurrency,
        senderFee: quotedSenderFee,
      });

    const quoteTokenValid =
      expectedQuoteToken.length > 0 &&
      quoteToken.length === expectedQuoteToken.length &&
      crypto.timingSafeEqual(Buffer.from(quoteToken), Buffer.from(expectedQuoteToken));

    if (!quoteTokenValid) {
      throw new Error("Your exchange quote is unavailable or no longer matches this payout. Refresh the quote before paying.");
    }

    const quoteExpiryTimestamp = parseQuoteExpiryTime(quoteExpiryTime);
    const quoteGracePeriodMs = getRemittancePolicy().quoteGracePeriodMs;
    // Reject locally before we ask TerraPay to create the transaction so checkout
    // can fail with a refresh-quote message instead of a provider-side hard error.
    if (!quoteExpiryTimestamp || Date.now() > quoteExpiryTimestamp + quoteGracePeriodMs) {
      throw new Error("Your exchange quote has expired. Refresh the quote before paying.");
    }

    // Step 2: Create the transaction using the quote reference.
    const creditParty = buildCreditParty(request, receivingCountry);
    const transactionRequest: TerraPayTransactionRequest = {
      requestDate: formatRequestDate(),
      type,
      requestAmount: Number(request.amountSent).toFixed(2),
      requestCurrency: request.currencyFrom,
      quoteId,
      debitParty: buildDebitParty(senderMsisdn),
      creditParty,
    };

    const transaction = await this.provider.createTransaction(transactionRequest);

    return {
      idempotencyKey,
      request,
      quote: {
        quoteId,
        quoteExpiryTime,
        fxRate: quotedFxRate,
        receivingAmount: quotedReceivingAmount,
        receivingCurrency: quotedReceivingCurrency,
        sendingAmount: request.amountSent,
        sendingCurrency: request.currencyFrom,
        senderFee: quotedSenderFee,
      },
      transaction,
      transfer: transaction,
    };
  }

  getSupportedBanks(): readonly string[] {
    return getRemittancePolicy().supportedBanks;
  }
}
