import crypto from "crypto";
import { z } from "zod";
import {
  ThunesProvider,
  type ThunesParticipant,
  type ThunesQuoteRequest,
  type ThunesTransactionRequest,
} from "../providers/thunesGatewayProvider";
import { sanitizeObject, sanitizePhoneNumber, sanitizeText } from "../../../utils/sanitize";

const MAX_EUR_AMOUNT = 5000;

const SUPPORTED_CASH_PICKUP_CHANNELS = [
  "HelloPaisa",
  "Quest Financial Services",
  "ZB Bank",
  "CBZ",
  "BancABC",
  "Steward Bank",
  "Mukuru",
] as const;

export type SupportedCashPickupChannel = (typeof SUPPORTED_CASH_PICKUP_CHANNELS)[number];

const ISO2_TO_ISO3: Record<string, string> = {
  AT: "AUT",
  BE: "BEL",
  BG: "BGR",
  CY: "CYP",
  CZ: "CZE",
  DE: "DEU",
  DK: "DNK",
  EE: "EST",
  ES: "ESP",
  FI: "FIN",
  FR: "FRA",
  GB: "GBR",
  GR: "GRC",
  HR: "HRV",
  HU: "HUN",
  IE: "IRL",
  IT: "ITA",
  LT: "LTU",
  LU: "LUX",
  LV: "LVA",
  MT: "MLT",
  NL: "NLD",
  PL: "POL",
  PT: "PRT",
  RO: "ROU",
  SE: "SWE",
  SI: "SVN",
  SK: "SVK",
  US: "USA",
  ZA: "ZAF",
  ZW: "ZWE",
};

const RemittanceSchema = z.object({
  idempotencyKey: z.string().uuid().optional(),
  recipientName: z.string().min(2).max(255),
  recipientType: z.enum(["mobile_money", "cash_pickup", "visa_card"]),
  provider: z.string().min(2).max(100).optional(),
  payoutChannel: z.string().min(2).max(100).optional(),
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
  originCountry: z.string().min(2).max(2).optional(),
  senderMsisdn: z.string().min(7).max(20).optional(),
  recipient: z
    .object({
      mobileNumber: z.string().min(7).max(20).optional(),
      cashPickupLocation: z.string().min(2).max(255).optional(),
      cardNumber: z.string().min(12).max(19).optional(),
      cardExpiryMonth: z.string().min(2).max(2).optional(),
      cardExpiryYear: z.string().min(2).max(4).optional(),
      cardHolderName: z.string().min(2).max(255).optional(),
    })
    .default({}),
  receivingCountry: z.string().min(2).max(2).default("ZW"),
  purposeOfRemittance: z.string().min(2).max(255).default("FAMILY_SUPPORT"),
});

export type RemittanceRequest = z.infer<typeof RemittanceSchema>;

export type SenderProfile = {
  full_name?: string;
  email?: string;
};

const QuotePreviewSchema = z.object({
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
  receivingCountry: z.string().min(2).max(2).default("ZW"),
  originCountry: z.string().min(2).max(2).optional(),
  senderMsisdn: z.string().min(7).max(20).optional(),
  recipientType: z.enum(["mobile_money", "cash_pickup", "visa_card"]).optional(),
  recipientMsisdn: z.string().min(7).max(20).optional(),
  recipientPan: z.string().min(12).max(40).optional(),
});

export type QuotePreviewRequest = z.infer<typeof QuotePreviewSchema>;

function toFinancialNumber(input: unknown): number | null {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const normalized = input.replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function compactObject<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && !value.trim()) continue;
    out[key] = value;
  }
  return out as T;
}

function toIso3(input: string | undefined): string | undefined {
  const normalized = sanitizeText(input, 3).toUpperCase();
  if (!normalized) return undefined;
  if (normalized.length === 3) return normalized;
  return ISO2_TO_ISO3[normalized];
}

function ensureIso3(input: string | undefined, label: string): string {
  const iso3 = toIso3(input);
  if (!iso3) {
    throw new Error(`${label} country ISO3 code is required for Thunes requests.`);
  }
  return iso3;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = sanitizeText(fullName, 255);
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function extractThunesFee(quote: any): number {
  const directCandidates: unknown[] = [
    quote?.fee?.amount,
    quote?.fee?.value,
    quote?.fees?.[0]?.amount,
    quote?.fees?.[0]?.value,
    quote?.pricing?.fee,
  ];

  for (const candidate of directCandidates) {
    const parsed = toFinancialNumber(candidate);
    if (parsed !== null && parsed >= 0) return Number(parsed.toFixed(2));
  }

  const sourceAmount = toFinancialNumber(quote?.source?.amount ?? quote?.sent_amount?.amount ?? quote?.source_amount?.amount);
  const totalPayable = toFinancialNumber(quote?.source?.total_amount ?? quote?.total_payable_amount);
  if (sourceAmount !== null && totalPayable !== null && totalPayable >= sourceAmount) {
    return Number((totalPayable - sourceAmount).toFixed(2));
  }

  return 0;
}

function normalizeThunesQuote(raw: any): any {
  const source = raw?.source ?? raw?.source_amount ?? raw?.sent_amount ?? {};
  const destination = raw?.destination ?? raw?.destination_amount ?? raw?.received_amount ?? {};
  const fxRate = toFinancialNumber(destination?.fx?.rate ?? raw?.fx?.rate ?? raw?.rate);
  const sendingAmount = toFinancialNumber(source?.amount ?? raw?.source_amount ?? raw?.sent_amount);
  const receivingAmount = toFinancialNumber(destination?.amount ?? raw?.destination_amount ?? raw?.received_amount);
  const sendingCurrency = String(source?.currency ?? raw?.source_currency ?? "").trim().toUpperCase();
  const receivingCurrency = String(destination?.currency ?? raw?.destination_currency ?? "").trim().toUpperCase();
  const quoteId = String(raw?.id ?? raw?.quotation_id ?? raw?.quotationReference ?? raw?.reference ?? "").trim();

  return {
    ...raw,
    quoteId: quoteId || undefined,
    fxRate: fxRate ?? raw?.fxRate,
    exchangeRate: fxRate ?? raw?.exchangeRate,
    sendingAmount: sendingAmount ?? raw?.sendingAmount,
    receivingAmount: receivingAmount ?? raw?.receivingAmount,
    sendingCurrency: sendingCurrency || raw?.sendingCurrency,
    receivingCurrency: receivingCurrency || raw?.receivingCurrency,
  };
}

function isValidLuhn(cardDigits: string): boolean {
  let sum = 0;
  let shouldDouble = false;

  for (let index = cardDigits.length - 1; index >= 0; index -= 1) {
    let digit = Number(cardDigits[index]);
    if (!Number.isFinite(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function parseExpiryYear(rawYear: string): number | null {
  const trimmed = String(rawYear ?? "").trim();
  if (!/^\d{2,4}$/.test(trimmed)) return null;
  if (trimmed.length === 2) {
    return 2000 + Number(trimmed);
  }
  return Number(trimmed);
}

export class ThunesService {
  constructor(private readonly provider: ThunesProvider) {}

  private normalize(input: unknown): RemittanceRequest {
    const sanitized = sanitizeObject((input ?? {}) as Record<string, unknown>);

    const parsed = RemittanceSchema.parse({
      ...sanitized,
      idempotencyKey: sanitizeText((sanitized as any)?.idempotencyKey, 64) || undefined,
      recipientName: sanitizeText((sanitized as any)?.recipientName, 255),
      provider: sanitizeText((sanitized as any)?.provider ?? "Thunes", 100),
      payoutChannel: sanitizeText((sanitized as any)?.payoutChannel ?? "", 100) || undefined,
      amountSent: Number((sanitized as any)?.amountSent),
      currencyFrom: sanitizeText((sanitized as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((sanitized as any)?.currencyTo ?? "USD", 10).toUpperCase(),
      originCountry: sanitizeText((sanitized as any)?.originCountry ?? "", 2).toUpperCase() || undefined,
      senderMsisdn: sanitizePhoneNumber((sanitized as any)?.senderMsisdn) || undefined,
      purposeOfRemittance: sanitizeText((sanitized as any)?.purposeOfRemittance ?? "FAMILY_SUPPORT", 255),
      receivingCountry: sanitizeText((sanitized as any)?.receivingCountry ?? "ZW", 2).toUpperCase(),
      recipient: {
        mobileNumber: sanitizePhoneNumber((sanitized as any)?.recipient?.mobileNumber) || undefined,
        cashPickupLocation:
          sanitizeText((sanitized as any)?.recipient?.cashPickupLocation, 255) || undefined,
        cardNumber:
          sanitizeText((sanitized as any)?.recipient?.cardNumber, 19).replace(/\s+/g, "") ||
          undefined,
        cardExpiryMonth:
          sanitizeText((sanitized as any)?.recipient?.cardExpiryMonth, 2) || undefined,
        cardExpiryYear:
          sanitizeText((sanitized as any)?.recipient?.cardExpiryYear, 4) || undefined,
        cardHolderName:
          sanitizeText((sanitized as any)?.recipient?.cardHolderName, 255) || undefined,
      },
    });

    if (parsed.amountSent > MAX_EUR_AMOUNT) {
      throw new Error(`Amount exceeds permitted limit of ${MAX_EUR_AMOUNT} EUR.`);
    }
    if ((sanitized as any)?.senderMsisdn && !parsed.senderMsisdn) {
      throw new Error("Sender mobile number is invalid.");
    }

    this.validatePayoutDetails(parsed);
    return parsed;
  }

  private normalizeQuotePreview(input: unknown): QuotePreviewRequest {
    const sanitized = sanitizeObject((input ?? {}) as Record<string, unknown>);
    const parsed = QuotePreviewSchema.parse({
      amountSent: Number((sanitized as any)?.amountSent),
      currencyFrom: sanitizeText((sanitized as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((sanitized as any)?.currencyTo ?? "USD", 10).toUpperCase(),
      receivingCountry: sanitizeText((sanitized as any)?.receivingCountry ?? "ZW", 2).toUpperCase(),
      originCountry: sanitizeText((sanitized as any)?.originCountry ?? "", 2).toUpperCase() || undefined,
      senderMsisdn: sanitizePhoneNumber((sanitized as any)?.senderMsisdn) || undefined,
      recipientType: sanitizeText((sanitized as any)?.recipientType ?? "", 32) || undefined,
      recipientMsisdn: sanitizePhoneNumber((sanitized as any)?.recipientMsisdn) || undefined,
      recipientPan: sanitizeText((sanitized as any)?.recipientPan ?? "", 40).replace(/\D/g, "") || undefined,
    });

    if (parsed.amountSent > MAX_EUR_AMOUNT) {
      throw new Error(`Amount exceeds permitted limit of ${MAX_EUR_AMOUNT} EUR.`);
    }
    if ((sanitized as any)?.senderMsisdn && !parsed.senderMsisdn) {
      throw new Error("Sender mobile number is invalid.");
    }
    if ((sanitized as any)?.recipientMsisdn && !parsed.recipientMsisdn) {
      throw new Error("Recipient mobile number is invalid.");
    }

    return parsed;
  }

  private validatePayoutDetails(payload: RemittanceRequest): void {
    if (payload.recipientType === "mobile_money") {
      if ((payload.provider ?? "").toLowerCase() !== "ecocash") {
        throw new Error("Mobile money payouts currently support EcoCash only.");
      }
      if (!payload.recipient.mobileNumber) {
        throw new Error("Recipient mobile number is required for mobile money payouts.");
      }
      return;
    }

    if (payload.recipientType === "cash_pickup") {
      const payoutChannel = payload.payoutChannel as SupportedCashPickupChannel | undefined;
      if (!payoutChannel || !SUPPORTED_CASH_PICKUP_CHANNELS.includes(payoutChannel)) {
        throw new Error(`Unsupported cash pickup channel. Allowed: ${SUPPORTED_CASH_PICKUP_CHANNELS.join(", ")}`);
      }
      if (!payload.recipient.cashPickupLocation) {
        throw new Error("Cash pickup location is required.");
      }
      return;
    }

    if (payload.recipientType === "visa_card") {
      if (!payload.recipient.cardNumber) throw new Error("Visa card number is required.");
      if (!payload.recipient.cardExpiryMonth || !payload.recipient.cardExpiryYear) {
        throw new Error("Visa card expiry month and year are required.");
      }
      if (!payload.recipient.cardHolderName) throw new Error("Card holder name is required.");

      const normalizedCard = String(payload.recipient.cardNumber).replace(/\D/g, "");
      if (!/^4\d{12}(\d{3}){0,2}$/.test(normalizedCard)) {
        throw new Error("Visa card number must be a valid Visa PAN.");
      }
      if (!isValidLuhn(normalizedCard)) {
        throw new Error("Visa card number failed validation.");
      }

      const expiryMonth = Number(payload.recipient.cardExpiryMonth);
      if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) {
        throw new Error("Card expiry month is invalid.");
      }

      const expiryYear = parseExpiryYear(payload.recipient.cardExpiryYear);
      if (!Number.isInteger(expiryYear) || !expiryYear || expiryYear < 2000 || expiryYear > 2200) {
        throw new Error("Card expiry year is invalid.");
      }

      const now = new Date();
      const expiryBoundary = new Date(expiryYear, expiryMonth, 0, 23, 59, 59, 999);
      if (expiryBoundary.getTime() < now.getTime()) {
        throw new Error("Card is expired.");
      }

      payload.recipient.cardNumber = normalizedCard;
      payload.recipient.cardExpiryMonth = String(expiryMonth).padStart(2, "0");
      payload.recipient.cardExpiryYear = String(expiryYear);
    }
  }

  private resolveSenderMsisdn(senderMsisdn?: string): string | undefined {
    const raw = String(senderMsisdn ?? "").trim();
    if (raw) {
      const normalized = sanitizePhoneNumber(raw);
      if (!normalized) {
        throw new Error("Sender mobile number is invalid.");
      }
      return normalized;
    }

    const fallback = sanitizePhoneNumber(
      process.env.THUNES_SENDER_MSISDN ?? process.env.THUNES_DEFAULT_MSISDN ?? ""
    );
    return fallback || undefined;
  }

  private resolvePayerId(recipientType: RemittanceRequest["recipientType"]): string {
    const keyByType: Record<RemittanceRequest["recipientType"], string> = {
      mobile_money: "THUNES_PAYER_ID_MOBILE_MONEY",
      cash_pickup: "THUNES_PAYER_ID_CASH_PICKUP",
      visa_card: "THUNES_PAYER_ID_VISA_CARD",
    };
    const direct = String(process.env[keyByType[recipientType]] ?? "").trim();
    const fallback = String(process.env.THUNES_PAYER_ID ?? "").trim();
    const resolved = direct || fallback;
    if (!resolved) {
      if (String(process.env.FINANCIAL_SANDBOX_MOCK ?? "").trim().toLowerCase() === "true") {
        return "9999";
      }
      throw new Error(
        "Thunes payer id is required. Set THUNES_PAYER_ID or a type-specific THUNES_PAYER_ID_* environment variable."
      );
    }
    return resolved;
  }

  private resolveTransactionType(): "C2C" | "C2B" | "B2C" | "B2B" {
    const raw = String(process.env.THUNES_TRANSACTION_TYPE ?? "").trim().toUpperCase();
    if (!raw) return "C2C";
    if (raw === "C2C" || raw === "C2B" || raw === "B2C" || raw === "B2B") return raw;
    throw new Error("THUNES_TRANSACTION_TYPE must be one of C2C, C2B, B2C, or B2B.");
  }

  private resolveSenderDob(): string {
    const dob = sanitizeText(process.env.THUNES_SENDER_DATE_OF_BIRTH ?? "", 32);
    if (!dob) {
      if (String(process.env.FINANCIAL_SANDBOX_MOCK ?? "").trim().toLowerCase() === "true") {
        return "1990-01-01";
      }
      throw new Error("Thunes sender date of birth is required. Set THUNES_SENDER_DATE_OF_BIRTH (YYYY-MM-DD).");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      throw new Error("THUNES_SENDER_DATE_OF_BIRTH must be in YYYY-MM-DD format.");
    }
    return dob;
  }

  private buildQuotePayload(input: {
    recipientType: RemittanceRequest["recipientType"];
    sendingCurrency: string;
    receivingCurrency: string;
    amount: number;
    originCountry?: string;
    receivingCountry: string;
    idempotencyKey?: string;
  }): ThunesQuoteRequest {
    const sourceCountry = ensureIso3(
      input.originCountry ?? process.env.THUNES_ORIGIN_COUNTRY ?? process.env.THUNES_ORIGIN_COUNTRY_ISO3,
      "Origin"
    );
    const destinationCountry = ensureIso3(
      input.receivingCountry ?? process.env.THUNES_RECEIVING_COUNTRY ?? process.env.THUNES_RECEIVING_COUNTRY_ISO3,
      "Destination"
    );
    const payerIdRaw = this.resolvePayerId(input.recipientType);
    const payerId = /^\d+$/.test(payerIdRaw) ? Number(payerIdRaw) : payerIdRaw;
    return {
      external_id: input.idempotencyKey,
      payer_id: payerId,
      mode: "SOURCE_AMOUNT",
      transaction_type: this.resolveTransactionType(),
      source: {
        amount: Number(input.amount).toFixed(2),
        currency: input.sendingCurrency,
        country_iso_code: sourceCountry,
      },
      destination: {
        currency: input.receivingCurrency,
        country_iso_code: destinationCountry,
      },
    };
  }

  private buildCreditPartyIdentifier(request: RemittanceRequest): Record<string, string> {
    if (request.recipientType === "visa_card") {
      const cardNumber = String(request.recipient.cardNumber ?? "").replace(/\s+/g, "");
      if (!cardNumber) {
        throw new Error("Card number is required for Thunes card payouts.");
      }
      return { card_number: cardNumber };
    }

    const msisdn = sanitizePhoneNumber(request.recipient.mobileNumber ?? "");
    if (!msisdn) {
      throw new Error("Recipient mobile number is required for Thunes payouts.");
    }
    return { msisdn };
  }

  private buildSender(profile: SenderProfile | null | undefined, request: RemittanceRequest, sourceCountryIso3: string): ThunesParticipant {
    const envFirst = sanitizeText(process.env.THUNES_SENDER_FIRSTNAME ?? "", 120);
    const envLast = sanitizeText(process.env.THUNES_SENDER_LASTNAME ?? "", 120);
    const nameParts = splitName(profile?.full_name ?? "");
    const firstName = nameParts.firstName || envFirst;
    const lastName = nameParts.lastName || envLast;

    if (!firstName || !lastName) {
      throw new Error("Sender first and last name are required for Thunes transfers.");
    }

    const senderCountryIso3 =
      toIso3(process.env.THUNES_SENDER_COUNTRY_ISO3 ?? sourceCountryIso3) ?? sourceCountryIso3;
    const nationalityIso3 =
      toIso3(process.env.THUNES_SENDER_NATIONALITY_ISO3 ?? senderCountryIso3) ?? senderCountryIso3;
    const birthCountryIso3 =
      toIso3(process.env.THUNES_SENDER_COUNTRY_OF_BIRTH_ISO3 ?? senderCountryIso3) ?? senderCountryIso3;

    return compactObject({
      firstname: firstName,
      lastname: lastName,
      date_of_birth: this.resolveSenderDob(),
      msisdn: this.resolveSenderMsisdn(request.senderMsisdn),
      email: sanitizeText(profile?.email ?? process.env.THUNES_SENDER_EMAIL ?? "", 255) || undefined,
      country_iso_code: senderCountryIso3,
      nationality_country_iso_code: nationalityIso3,
      country_of_birth_iso_code: birthCountryIso3,
      address: sanitizeText(process.env.THUNES_SENDER_ADDRESS ?? "", 255) || undefined,
      city: sanitizeText(process.env.THUNES_SENDER_CITY ?? "", 120) || undefined,
      postal_code: sanitizeText(process.env.THUNES_SENDER_POSTAL_CODE ?? "", 40) || undefined,
      gender: sanitizeText(process.env.THUNES_SENDER_GENDER ?? "", 20) || undefined,
      id_type: sanitizeText(process.env.THUNES_SENDER_ID_TYPE ?? "", 40) || undefined,
      id_number: sanitizeText(process.env.THUNES_SENDER_ID_NUMBER ?? "", 80) || undefined,
      id_country_iso_code: toIso3(process.env.THUNES_SENDER_ID_COUNTRY_ISO3 ?? "") || undefined,
      occupation: sanitizeText(process.env.THUNES_SENDER_OCCUPATION ?? "", 80) || undefined,
    });
  }

  private buildBeneficiary(request: RemittanceRequest, destinationCountryIso3: string): ThunesParticipant {
    const envFirst = sanitizeText(process.env.THUNES_BENEFICIARY_FIRSTNAME ?? "", 120);
    const envLast = sanitizeText(process.env.THUNES_BENEFICIARY_LASTNAME ?? "", 120);
    const nameParts = splitName(request.recipientName ?? "");
    const firstName = nameParts.firstName || envFirst;
    const lastName = nameParts.lastName || envLast;

    if (!firstName || !lastName) {
      throw new Error("Beneficiary first and last name are required for Thunes transfers.");
    }

    const beneficiaryCountryIso3 =
      toIso3(process.env.THUNES_BENEFICIARY_COUNTRY_ISO3 ?? destinationCountryIso3) ?? destinationCountryIso3;
    const beneficiaryNationalityIso3 =
      toIso3(process.env.THUNES_BENEFICIARY_NATIONALITY_ISO3 ?? beneficiaryCountryIso3) ?? beneficiaryCountryIso3;
    const beneficiaryBirthIso3 =
      toIso3(process.env.THUNES_BENEFICIARY_COUNTRY_OF_BIRTH_ISO3 ?? beneficiaryCountryIso3) ?? beneficiaryCountryIso3;
    const beneficiaryDob = sanitizeText(process.env.THUNES_BENEFICIARY_DATE_OF_BIRTH ?? "", 32);

    return compactObject({
      firstname: firstName,
      lastname: lastName,
      msisdn: sanitizePhoneNumber(request.recipient.mobileNumber ?? "") || undefined,
      country_iso_code: beneficiaryCountryIso3,
      nationality_country_iso_code: beneficiaryNationalityIso3,
      country_of_birth_iso_code: beneficiaryBirthIso3,
      date_of_birth: /^\d{4}-\d{2}-\d{2}$/.test(beneficiaryDob) ? beneficiaryDob : undefined,
      address: sanitizeText(process.env.THUNES_BENEFICIARY_ADDRESS ?? "", 255) || undefined,
      city: sanitizeText(process.env.THUNES_BENEFICIARY_CITY ?? "", 120) || undefined,
      postal_code: sanitizeText(process.env.THUNES_BENEFICIARY_POSTAL_CODE ?? "", 40) || undefined,
      email: sanitizeText(process.env.THUNES_BENEFICIARY_EMAIL ?? "", 255) || undefined,
    });
  }

  async previewFxQuote(input: unknown): Promise<any> {
    const payload = this.normalizeQuotePreview(input);
    const idempotencyKey = crypto.randomUUID();
    const resolvedRecipientType =
      payload.recipientType && ["mobile_money", "cash_pickup", "visa_card"].includes(payload.recipientType)
        ? (payload.recipientType as RemittanceRequest["recipientType"])
        : "mobile_money";

    const quoteRequest = this.buildQuotePayload({
      recipientType: resolvedRecipientType,
      sendingCurrency: payload.currencyFrom,
      receivingCurrency: payload.currencyTo,
      amount: payload.amountSent,
      originCountry: payload.originCountry,
      receivingCountry: payload.receivingCountry,
      idempotencyKey,
    });

    const quoteRaw = await this.provider.createQuotation(quoteRequest);
    const normalizedQuote = normalizeThunesQuote(quoteRaw);
    const quote = {
      ...normalizedQuote,
      fee: extractThunesFee(quoteRaw),
    };
    return {
      idempotencyKey,
      quote,
      normalizedRequest: payload,
    };
  }

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

    const quoteRequest = this.buildQuotePayload({
      recipientType: request.recipientType,
      sendingCurrency: request.currencyFrom,
      receivingCurrency: request.currencyTo,
      amount: request.amountSent,
      originCountry: request.originCountry,
      receivingCountry: request.receivingCountry,
      idempotencyKey,
    });

    const quoteRaw = await this.provider.createQuotation(quoteRequest);
    const normalizedQuote = normalizeThunesQuote(quoteRaw);
    const quote = {
      ...normalizedQuote,
      fee: extractThunesFee(quoteRaw),
    };

    const quoteId = String(quote?.quoteId ?? quoteRaw?.id ?? "").trim();
    if (!quoteId) {
      throw new Error("Thunes quotation id is missing.");
    }

    const sourceCountryIso3 = ensureIso3(
      request.originCountry ?? process.env.THUNES_ORIGIN_COUNTRY ?? process.env.THUNES_ORIGIN_COUNTRY_ISO3,
      "Origin"
    );
    const destinationCountryIso3 = ensureIso3(
      request.receivingCountry ?? process.env.THUNES_RECEIVING_COUNTRY ?? process.env.THUNES_RECEIVING_COUNTRY_ISO3,
      "Destination"
    );

    const sender = this.buildSender(senderProfile, request, sourceCountryIso3);
    const beneficiary = this.buildBeneficiary(request, destinationCountryIso3);
    const additionalInformation: Record<string, unknown> = {};
    if (request.payoutChannel) additionalInformation.payout_channel = request.payoutChannel;
    if (request.recipient.cashPickupLocation) {
      additionalInformation.cash_pickup_location = request.recipient.cashPickupLocation;
    }

    const transactionRequest: ThunesTransactionRequest = {
      external_id: idempotencyKey,
      credit_party_identifier: this.buildCreditPartyIdentifier(request),
      sender,
      beneficiary,
      purpose_of_remittance: request.purposeOfRemittance,
      callback_url: sanitizeText(process.env.THUNES_CALLBACK_URL ?? "", 400) || undefined,
      statement_description: sanitizeText(process.env.THUNES_STATEMENT_DESCRIPTION ?? "", 140) || undefined,
      additional_information: Object.keys(additionalInformation).length ? additionalInformation : undefined,
    };

    const transaction = await this.provider.createTransaction(quoteId, transactionRequest);
    const transactionId = String(transaction?.id ?? transaction?.transaction_id ?? "").trim();
    if (!transactionId) {
      throw new Error("Thunes transaction id is missing.");
    }

    const confirmation = await this.provider.confirmTransaction(transactionId);
    const transfer = {
      ...transaction,
      ...confirmation,
      id: confirmation?.id ?? transactionId,
    };

    // Mask card number in the returned request — store only last 4 digits to avoid PCI exposure
    const safeRequest: RemittanceRequest = { ...request };
    if (safeRequest.recipient?.cardNumber) {
      const digits = String(safeRequest.recipient.cardNumber).replace(/\D/g, "");
      safeRequest.recipient = { ...safeRequest.recipient, cardNumber: `****${digits.slice(-4)}` };
    }

    return {
      idempotencyKey,
      request: safeRequest,
      quote,
      transaction,
      transfer,
    };
  }

  getSupportedCashPickupChannels(): readonly SupportedCashPickupChannel[] {
    return SUPPORTED_CASH_PICKUP_CHANNELS;
  }
}
