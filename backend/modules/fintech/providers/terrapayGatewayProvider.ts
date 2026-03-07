import axios, { type AxiosInstance } from "axios";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

export type TerraPayQuoteRequest = {
  sendingCurrency: string;
  receivingCurrency: string;
  sendingAmount: number;
  receivingCountry: string;
};

export type TerraPayBeneficiaryRequest = {
  recipientName: string;
  recipientType: "mobile_money" | "cash_pickup" | "visa_card";
  payoutChannel?: string;
  mobileNumber?: string;
  cashPickupLocation?: string;
  cardNumber?: string;
  cardExpiryMonth?: string;
  cardExpiryYear?: string;
  cardHolderName?: string;
};

export type TerraPayTransferRequest = {
  idempotencyKey: string;
  quoteReference?: string;
  beneficiaryReference: string;
  payoutChannel?: string;
  senderCurrency: string;
  receiverCurrency: string;
  amount: number;
  purposeOfRemittance: string;
};

export class TerraPayProvider implements FinancialProvider {
  readonly providerName = "terrapay";
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL = String(process.env.TERRAPAY_BASE_URL ?? "https://uat-connect.terrapay.com").replace(/\/+$/, "");
    const apiKey = String(process.env.TERRAPAY_API_KEY ?? "").trim();
    const clientId = String(process.env.TERRAPAY_CLIENT_ID ?? "").trim();
    const clientSecret = String(process.env.TERRAPAY_SECRET ?? "").trim();

    this.client = axios.create({
      baseURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
        ...(clientId ? { "X-Client-Id": clientId } : {}),
        ...(clientSecret ? { "X-Client-Secret": clientSecret } : {}),
      },
    });

    this.client.interceptors.request.use((config) => {
      (config as any).metadata = { startedAt: Date.now() };
      console.info(`[terrapay:req] ${String(config.method ?? "GET").toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        const latencyMs = Date.now() - startedAt;
        console.info(
          `[terrapay:res] ${String(response.config.method ?? "GET").toUpperCase()} ${response.config.url} -> ${response.status} (${latencyMs}ms)`
        );
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = String(error?.config?.url ?? "");
        const status = Number(error?.response?.status ?? 0);
        const detail = String(error?.response?.data?.message ?? error?.message ?? "TerraPay request failed");
        console.error(`[terrapay:err] ${method} ${url} -> ${status || "NO_STATUS"} ${detail}`);
        return Promise.reject(error);
      }
    );
  }

  supports(feature: FinancialFeature): boolean {
    return feature === "remittance";
  }

  private isMockMode(): boolean {
    return String(process.env.FINANCIAL_SANDBOX_MOCK ?? "")
      .trim()
      .toLowerCase() === "true";
  }

  private assertConfigured() {
    const required = ["TERRAPAY_API_KEY", "TERRAPAY_CLIENT_ID", "TERRAPAY_SECRET"];
    const missing = required.filter((key) => !String(process.env[key] ?? "").trim());
    if (missing.length > 0) {
      throw new Error(`TerraPay configuration missing: ${missing.join(", ")}`);
    }
  }

  async getFxQuote(payload: TerraPayQuoteRequest, idempotencyKey: string): Promise<any> {
    if (this.isMockMode()) {
      const fxRate = 1.07;
      const fee = Number((payload.sendingAmount * 0.01 + 0.5).toFixed(2));
      return {
        quoteId: `Q-${idempotencyKey.slice(0, 8)}`,
        fxRate,
        exchangeRate: fxRate,
        sendingAmount: payload.sendingAmount,
        receivingAmount: Number((payload.sendingAmount * fxRate).toFixed(2)),
        fee,
        totalFee: fee,
        sendingCurrency: payload.sendingCurrency,
        receivingCurrency: payload.receivingCurrency,
      };
    }
    this.assertConfigured();
    const response = await this.client.post("/v1/quotations", payload, {
      headers: { "X-Idempotency-Key": idempotencyKey },
    });
    return response.data;
  }

  async createBeneficiary(payload: TerraPayBeneficiaryRequest, idempotencyKey: string): Promise<any> {
    if (this.isMockMode()) {
      return {
        beneficiaryId: `B-${idempotencyKey.slice(0, 8)}`,
        reference: `BEN-${idempotencyKey.slice(0, 8)}`,
        status: "created",
        ...payload,
      };
    }
    this.assertConfigured();
    const response = await this.client.post("/v1/beneficiaries", payload, {
      headers: { "X-Idempotency-Key": idempotencyKey },
    });
    return response.data;
  }

  async initiateTransaction(payload: TerraPayTransferRequest): Promise<any> {
    if (this.isMockMode()) {
      const rate = 1.07;
      return {
        transactionId: `T-${payload.idempotencyKey.slice(0, 8)}`,
        reference: `TX-${payload.idempotencyKey.slice(0, 8)}`,
        status: "processing",
        amountSent: payload.amount,
        amountReceived: Number((payload.amount * rate).toFixed(2)),
        senderCurrency: payload.senderCurrency,
        receiverCurrency: payload.receiverCurrency,
      };
    }
    this.assertConfigured();
    const response = await this.client.post("/v1/transactions", payload, {
      headers: { "X-Idempotency-Key": payload.idempotencyKey },
    });
    return response.data;
  }
}
