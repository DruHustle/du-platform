import crypto from "crypto";
import { z } from "zod";
import { ReloadlyProvider } from "../providers/reloadlyGatewayProvider";
import { sanitizeObject, sanitizePhoneNumber, sanitizeText } from "../../../utils/sanitize";

const AirtimeTopupSchema = z.object({
  phoneNumber: z.string().min(8).max(20),
  amount: z.number().positive(),
  currency: z.string().min(3).max(10).optional(),
});

export type AirtimeTopupRequest = z.infer<typeof AirtimeTopupSchema>;

function toFiniteNumber(input: unknown): number | null {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function extractReloadlyFee(payloads: any[]): number | null {
  const candidates: unknown[] = [];
  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") continue;
    candidates.push(
      payload.fee,
      payload.fees?.total,
      payload.fees?.sender,
      payload.senderFee,
      payload.fixedSenderFee,
      payload.fixedFee,
      payload.totalFee
    );
  }

  for (const candidate of candidates) {
    const parsed = toFiniteNumber(candidate);
    if (parsed !== null) return parsed;
  }

  return null;
}

function normalizeZimbabweNumber(rawInput: string): string {
  const raw = sanitizePhoneNumber(rawInput).replace(/\s+/g, "");

  if (/^\+2637\d{8}$/.test(raw)) return raw;
  if (/^2637\d{8}$/.test(raw)) return `+${raw}`;
  if (/^07\d{8}$/.test(raw)) return `+263${raw.slice(1)}`;

  throw new Error("Invalid Zimbabwe phone number. Use +2637XXXXXXXX or 07XXXXXXXX.");
}

export class ReloadlyService {
  constructor(private readonly provider: ReloadlyProvider) {}

  private normalizePayload(input: unknown): AirtimeTopupRequest {
    const sanitized = sanitizeObject((input ?? {}) as Record<string, unknown>);
    return AirtimeTopupSchema.parse({
      phoneNumber: sanitizeText((sanitized as any)?.phoneNumber, 20),
      amount: Number((sanitized as any)?.amount),
      currency: sanitizeText((sanitized as any)?.currency ?? "USD", 10).toUpperCase(),
    });
  }

  async detectOperator(phoneNumberInput: string): Promise<any> {
    await this.provider.getAccessToken();
    const phoneNumber = normalizeZimbabweNumber(phoneNumberInput);
    return this.provider.detectOperator(phoneNumber, "ZW");
  }

  async fetchTopupOptions(phoneNumberInput: string): Promise<any> {
    const operator = await this.detectOperator(phoneNumberInput);
    const operatorId = Number(operator?.operatorId ?? operator?.id);
    if (!Number.isFinite(operatorId) || operatorId <= 0) {
      throw new Error("Unable to detect an airtime operator for this number.");
    }

    const operatorDetail = await this.provider.getOperatorById(Math.floor(operatorId));
    const suggestedAmounts = Array.isArray(operatorDetail?.suggestedAmounts)
      ? operatorDetail.suggestedAmounts
      : [];

    return {
      operator,
      options: {
        operatorId: Math.floor(operatorId),
        name: String(operatorDetail?.name ?? operator?.name ?? "Unknown Operator"),
        countryCode: "ZW",
        localAmountSupported: Boolean(operatorDetail?.localAmountSupported),
        minAmount: operatorDetail?.minAmount ?? null,
        maxAmount: operatorDetail?.maxAmount ?? null,
        fee: extractReloadlyFee([operatorDetail, operator]),
        suggestedAmounts,
      },
    };
  }

  async createTopup(input: unknown): Promise<{
    request: AirtimeTopupRequest;
    normalizedPhone: string;
    operator: any;
    topup: any;
    reference: string;
  }> {
    const request = this.normalizePayload(input);
    const normalizedPhone = normalizeZimbabweNumber(request.phoneNumber);
    const operator = await this.detectOperator(normalizedPhone);
    const operatorId = Number(operator?.operatorId ?? operator?.id);

    if (!Number.isFinite(operatorId) || operatorId <= 0) {
      throw new Error("Unable to detect operator for top-up request.");
    }

    const reference = crypto.randomUUID();
    const topup = await this.provider.createTopup({
      operatorId: Math.floor(operatorId),
      amount: request.amount,
      recipientPhone: {
        countryCode: "ZW",
        number: normalizedPhone,
      },
      customIdentifier: reference,
    });

    return {
      request,
      normalizedPhone,
      operator,
      topup,
      reference,
    };
  }
}
