import axios, { type AxiosInstance } from "axios";
import { logger } from "../../../core/logger";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

/** Mask URLs before logging to prevent leaking sensitive path segments. */
function sanitizeUrlForLog(url: string): string {
  return url
    .replace(/\/(\+?\d{3,4})\d{5,}/g, "/$1****")
    .replace(/\/(\d{4})\d{8,}(\d{4})/g, "/$1****$2");
}

export type ThunesQuoteRequest = {
  external_id?: string;
  payer_id: string | number;
  mode: "SOURCE_AMOUNT" | "DESTINATION_AMOUNT";
  transaction_type: "C2C" | "C2B" | "B2C" | "B2B";
  source: {
    amount: string;
    currency: string;
    country_iso_code: string;
  };
  destination: {
    amount?: string;
    currency: string;
    country_iso_code: string;
  };
};

export type ThunesParticipant = {
  firstname?: string;
  lastname?: string;
  nationality_country_iso_code?: string;
  country_of_birth_iso_code?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country_iso_code?: string;
  msisdn?: string;
  email?: string;
  id_type?: string;
  id_number?: string;
  id_country_iso_code?: string;
  occupation?: string;
};

export type ThunesTransactionRequest = {
  external_id?: string;
  credit_party_identifier: Record<string, string>;
  sender?: ThunesParticipant;
  beneficiary?: ThunesParticipant;
  purpose_of_remittance?: string;
  callback_url?: string;
  document_reference_number?: string;
  statement_description?: string;
  retail_fee?: {
    amount: string;
    currency: string;
  };
  additional_information?: Record<string, unknown>;
};

export class ThunesProvider implements FinancialProvider {
  readonly providerName = "thunes";
  private readonly client: AxiosInstance;

  constructor() {
    const baseURL = String(process.env.THUNES_BASE_URL ?? "https://api-mt.preprod.thunes.com/v2/money-transfer").replace(
      /\/+$/,
      ""
    );
    const apiKey = String(process.env.THUNES_API_KEY ?? "").trim();
    const apiSecret = String(process.env.THUNES_API_SECRET ?? "").trim();

    this.client = axios.create({
      baseURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(apiKey || apiSecret ? { auth: { username: apiKey, password: apiSecret } } : {}),
    });

    this.client.interceptors.request.use((config) => {
      (config as any).metadata = { startedAt: Date.now() };
      logger.info("thunes_request", { method: String(config.method ?? "GET").toUpperCase(), url: sanitizeUrlForLog(`${config.baseURL}${config.url}`) });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        const latencyMs = Date.now() - startedAt;
        logger.info("thunes_response", { method: String(response.config.method ?? "GET").toUpperCase(), url: sanitizeUrlForLog(String(response.config.url ?? "")), status: response.status, latencyMs });
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = sanitizeUrlForLog(String(error?.config?.url ?? ""));
        const status = Number(error?.response?.status ?? 0);
        const detail = String(error?.response?.data?.message ?? error?.response?.data?.error ?? error?.message ?? "Thunes request failed");
        logger.error("thunes_error", { method, url, status: status || "NO_STATUS", detail });
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
    const required = ["THUNES_API_KEY", "THUNES_API_SECRET"];
    const missing = required.filter((key) => !String(process.env[key] ?? "").trim());
    if (missing.length > 0) {
      throw new Error(`Thunes configuration missing: ${missing.join(", ")}`);
    }
  }

  async createQuotation(payload: ThunesQuoteRequest): Promise<any> {
    if (this.isMockMode()) {
      const sameCurrency = payload.source.currency === payload.destination.currency;
      const fxRate = sameCurrency ? 1.0 : 1.12;
      const sourceAmount = Number(payload.source.amount) || 0;
      const fee = Number((sourceAmount * 0.01 + 0.5).toFixed(2));
      return {
        id: `Q-${payload.external_id?.slice(0, 8) ?? "mock"}`,
        external_id: payload.external_id,
        mode: payload.mode,
        transaction_type: payload.transaction_type,
        payer: { id: payload.payer_id, name: "Mock Payer" },
        source: { ...payload.source, amount: payload.source.amount },
        destination: {
          ...payload.destination,
          amount: Number((sourceAmount * fxRate).toFixed(2)).toFixed(2),
          fx: { rate: fxRate.toFixed(4) },
        },
        fee: { amount: fee.toFixed(2), currency: payload.source.currency },
        status: "ACCEPTED",
        creation_date: new Date().toISOString(),
        expiration_date: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      };
    }

    this.assertConfigured();
    const response = await this.client.post("/quotations", payload);
    return response.data;
  }

  async createTransaction(quotationId: string, payload: ThunesTransactionRequest): Promise<any> {
    if (this.isMockMode()) {
      return {
        id: `T-${payload.external_id?.slice(0, 8) ?? "mock"}`,
        external_id: payload.external_id,
        status: "PROCESSING",
        credit_party_identifier: payload.credit_party_identifier,
        sender: payload.sender,
        beneficiary: payload.beneficiary,
      };
    }

    this.assertConfigured();
    const response = await this.client.post(`/quotations/${encodeURIComponent(quotationId)}/transactions`, payload);
    return response.data;
  }

  async confirmTransaction(transactionId: string): Promise<any> {
    if (this.isMockMode()) {
      return {
        id: transactionId,
        status: "COMPLETED",
      };
    }

    this.assertConfigured();
    const response = await this.client.post(`/transactions/${encodeURIComponent(transactionId)}/confirm`);
    return response.data;
  }
}
