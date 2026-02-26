import crypto from "crypto";
import { z } from "zod";
import {
  TerraPayProvider,
  type TerraPayBeneficiaryRequest,
  type TerraPayQuoteRequest,
  type TerraPayTransferRequest,
} from "../providers/terrapayProvider";
import { sanitizeObject, sanitizePhoneNumber, sanitizeText } from "../utils/sanitize";

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

const RemittanceSchema = z.object({
  recipientName: z.string().min(2).max(255),
  recipientType: z.enum(["mobile_money", "cash_pickup", "visa_card"]),
  provider: z.string().min(2).max(100).optional(),
  payoutChannel: z.string().min(2).max(100).optional(),
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
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

const QuotePreviewSchema = z.object({
  amountSent: z.number().positive(),
  currencyFrom: z.string().min(3).max(10),
  currencyTo: z.string().min(3).max(10),
  receivingCountry: z.string().min(2).max(2).default("ZW"),
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

function extractTerraPayFee(quote: any): number {
  const directCandidates: unknown[] = [
    quote?.fee,
    quote?.totalFee,
    quote?.feeAmount,
    quote?.serviceFee,
    quote?.senderFee,
    quote?.charges?.total,
    quote?.charges?.fee,
    quote?.pricing?.fee,
    quote?.priceBreakdown?.fee,
    quote?.fees?.total,
    quote?.fees?.sender,
  ];

  for (const candidate of directCandidates) {
    const parsed = toFinancialNumber(candidate);
    if (parsed !== null && parsed >= 0) return Number(parsed.toFixed(2));
  }

  if (Array.isArray(quote?.fees)) {
    const feeSum = quote.fees.reduce((sum: number, item: any) => {
      const parsed = toFinancialNumber(item?.amount ?? item?.fee ?? item?.value);
      return parsed !== null && parsed >= 0 ? sum + parsed : sum;
    }, 0);
    if (feeSum > 0) return Number(feeSum.toFixed(2));
  }

  const totalPayable = toFinancialNumber(
    quote?.totalPayableAmount ?? quote?.totalAmount ?? quote?.payInAmount ?? quote?.senderAmountTotal
  );
  const sendingAmount = toFinancialNumber(quote?.sendingAmount ?? quote?.sendAmount ?? quote?.amount);
  if (totalPayable !== null && sendingAmount !== null && totalPayable >= sendingAmount) {
    return Number((totalPayable - sendingAmount).toFixed(2));
  }

  return 0;
}

export class TerrapayService {
  constructor(private readonly provider: TerraPayProvider) {}

  private normalize(input: unknown): RemittanceRequest {
    const sanitized = sanitizeObject((input ?? {}) as Record<string, unknown>);

    const parsed = RemittanceSchema.parse({
      ...sanitized,
      recipientName: sanitizeText((sanitized as any)?.recipientName, 255),
      provider: sanitizeText((sanitized as any)?.provider ?? "TerraPay", 100),
      payoutChannel: sanitizeText((sanitized as any)?.payoutChannel ?? "", 100) || undefined,
      amountSent: Number((sanitized as any)?.amountSent),
      currencyFrom: sanitizeText((sanitized as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((sanitized as any)?.currencyTo ?? "USD", 10).toUpperCase(),
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

    this.validatePayoutDetails(parsed);
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
    }
  }

  private normalizeQuotePreview(input: unknown): QuotePreviewRequest {
    const sanitized = sanitizeObject((input ?? {}) as Record<string, unknown>);
    const parsed = QuotePreviewSchema.parse({
      amountSent: Number((sanitized as any)?.amountSent),
      currencyFrom: sanitizeText((sanitized as any)?.currencyFrom ?? "EUR", 10).toUpperCase(),
      currencyTo: sanitizeText((sanitized as any)?.currencyTo ?? "USD", 10).toUpperCase(),
      receivingCountry: sanitizeText((sanitized as any)?.receivingCountry ?? "ZW", 2).toUpperCase(),
    });

    if (parsed.amountSent > MAX_EUR_AMOUNT) {
      throw new Error(`Amount exceeds permitted limit of ${MAX_EUR_AMOUNT} EUR.`);
    }

    return parsed;
  }

  async previewFxQuote(input: unknown): Promise<any> {
    const payload = this.normalizeQuotePreview(input);
    const idempotencyKey = crypto.randomUUID();

    const quoteRequest: TerraPayQuoteRequest = {
      sendingCurrency: payload.currencyFrom,
      receivingCurrency: payload.currencyTo,
      sendingAmount: payload.amountSent,
      receivingCountry: payload.receivingCountry,
    };

    const quoteRaw = await this.provider.getFxQuote(quoteRequest, idempotencyKey);
    const quote = {
      ...quoteRaw,
      fee: extractTerraPayFee(quoteRaw),
    };
    return {
      idempotencyKey,
      quote,
      normalizedRequest: payload,
    };
  }

  async sendMoney(input: unknown): Promise<{
    idempotencyKey: string;
    request: RemittanceRequest;
    quote: any;
    beneficiary: any;
    transfer: any;
  }> {
    const request = this.normalize(input);
    const idempotencyKey = crypto.randomUUID();

    const quoteRequest: TerraPayQuoteRequest = {
      sendingCurrency: request.currencyFrom,
      receivingCurrency: request.currencyTo,
      sendingAmount: request.amountSent,
      receivingCountry: request.receivingCountry,
    };
    const quoteRaw = await this.provider.getFxQuote(quoteRequest, idempotencyKey);
    const quote = {
      ...quoteRaw,
      fee: extractTerraPayFee(quoteRaw),
    };

    const beneficiaryRequest: TerraPayBeneficiaryRequest = {
      recipientName: request.recipientName,
      recipientType: request.recipientType,
      payoutChannel: request.payoutChannel,
      mobileNumber: request.recipient.mobileNumber,
      cashPickupLocation: request.recipient.cashPickupLocation,
      cardNumber: request.recipient.cardNumber,
      cardExpiryMonth: request.recipient.cardExpiryMonth,
      cardExpiryYear: request.recipient.cardExpiryYear,
      cardHolderName: request.recipient.cardHolderName,
    };

    const beneficiary = await this.provider.createBeneficiary(beneficiaryRequest, idempotencyKey);

    const transferRequest: TerraPayTransferRequest = {
      idempotencyKey,
      quoteReference: String(quote?.quoteId ?? quote?.reference ?? ""),
      beneficiaryReference: String(beneficiary?.beneficiaryId ?? beneficiary?.reference ?? ""),
      payoutChannel: request.payoutChannel,
      senderCurrency: request.currencyFrom,
      receiverCurrency: request.currencyTo,
      amount: request.amountSent,
      purposeOfRemittance: request.purposeOfRemittance,
    };

    const transfer = await this.provider.initiateTransaction(transferRequest);

    return {
      idempotencyKey,
      request,
      quote,
      beneficiary,
      transfer,
    };
  }

  getSupportedCashPickupChannels(): readonly SupportedCashPickupChannel[] {
    return SUPPORTED_CASH_PICKUP_CHANNELS;
  }
}
