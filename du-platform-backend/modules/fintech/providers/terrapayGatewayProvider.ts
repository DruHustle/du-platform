import crypto from "crypto";
import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { logger } from "../../../core/logger";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

/** Format a Date as "YYYY-MM-DD HH:mm:ss" (UTC) — required by TerraPay X-DATE header. */
function formatTerraPayDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
  );
}

/** SHA-256 hex of the raw password string, as required by TerraPay X-PASSWORD header. */
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Mask MSISDN digits in URLs before logging. */
function sanitizeUrlForLog(url: string): string {
  return url
    .replace(/\/(\+?\d{3,4})\d{5,}/g, "/$1****")
    .replace(/msisdn=(\+?\d{3,4})\d{5,}/g, "msisdn=$1****");
}

function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  if (config.headers instanceof AxiosHeaders) {
    return config.headers;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  config.headers = headers;
  return headers;
}

function shouldRetryProviderError(error: unknown): boolean {
  const status = Number((error as any)?.response?.status ?? 0);
  const code = String((error as any)?.code ?? '').trim().toUpperCase();

  if ([408, 429, 500, 502, 503, 504].includes(status)) {
    return true;
  }

  return [
    'ECONNABORTED',
    'ECONNRESET',
    'ENOTFOUND',
    'EAI_AGAIN',
    'ETIMEDOUT',
  ].includes(code);
}

async function withProviderRetry<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let delayMs = 250;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= 3 || !shouldRetryProviderError(error)) {
        throw error;
      }

      logger.warn('terrapay_retry', {
        operation: operationName,
        attempt,
        delayMs,
        status: Number((error as any)?.response?.status ?? 0) || null,
        code: String((error as any)?.code ?? '').trim() || null,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2;
    }
  }
}

// ─── Request / Response types ────────────────────────────────────────────────

export type TerraPayKvPair = { key: string; value: string };

export type TerraPayQuoteRequest = {
  requestDate: string;
  type: "p2p" | "p2b" | "b2p" | "b2b";
  debitParty: TerraPayKvPair[];
  creditParty: TerraPayKvPair[];
  requestAmount: string;
  requestCurrency: string;
  quotes: Array<{ sendingCurrency: string; receivingCurrency: string }>;
};

export type TerraPayQuoteResult = {
  quoteId: string;
  quoteExpiryTime: string;
  sendingAmount: string;
  sendingCurrency: string;
  receivingAmount: string;
  receivingCurrency: string;
  fxRate: string;
};

export type TerraPayQuoteResponse = {
  requestDate: string;
  quotes: TerraPayQuoteResult[];
  quotationReference: string;
  quotationStatus: string;
};

export type TerraPayTransactionRequest = {
  requestDate: string;
  type: "p2p" | "p2b" | "b2p" | "b2b";
  requestAmount: string;
  requestCurrency: string;
  quoteId: string;
  debitParty: TerraPayKvPair[];
  creditParty: TerraPayKvPair[];
};

export type TerraPayTransactionResponse = {
  transactionId: string;
  transactionStatus: string;
  debitParty?: TerraPayKvPair[];
  creditParty?: TerraPayKvPair[];
  requestAmount?: string;
  requestCurrency?: string;
  quotes?: TerraPayQuoteResult[];
};

export type TerraPayAccountStatusResponse = {
  status: "available" | "unavailable" | "unregistered" | string;
  subStatus?: string;
  lei?: string;
};

export type TerraPayError = {
  errorCategory: string;
  errorCode: string;
  errorDescription: string;
  errorDateTime: string;
};

// ─── Provider class ───────────────────────────────────────────────────────────

export class TerraPayProvider implements FinancialProvider {
  readonly providerName = "terrapay";
  readonly displayName = "TerraPay";
  private readonly client: AxiosInstance;
  private readonly username: string;
  private readonly passwordHash: string;
  private readonly originCountry: string;

  constructor() {
    const baseURL = String(
      process.env.TERRAPAY_BASE_URL ?? "https://uat-connect.terrapay.com:21211"
    ).replace(/\/+$/, "");

    this.username = String(process.env.TERRAPAY_USERNAME ?? "").trim();
    const rawPassword = String(process.env.TERRAPAY_PASSWORD ?? "").trim();
    this.passwordHash = rawPassword ? sha256(rawPassword) : "";
    this.originCountry = String(process.env.TERRAPAY_ORIGIN_COUNTRY ?? "DE").trim().toUpperCase();

    this.client = axios.create({
      baseURL,
      timeout: 25_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Inject TerraPay auth headers on every request.
    this.client.interceptors.request.use((config) => {
      (config as any).metadata = { startedAt: Date.now() };
      const headers = ensureAxiosHeaders(config);
      headers.set("X-USERNAME", this.username);
      headers.set("X-PASSWORD", this.passwordHash);
      headers.set("X-DATE", formatTerraPayDate());
      headers.set("X-ORIGINCOUNTRY", this.originCountry);
      logger.info("terrapay_request", {
        method: String(config.method ?? "GET").toUpperCase(),
        url: sanitizeUrlForLog(`${config.baseURL ?? ""}${config.url ?? ""}`),
      });
      return config;
    });

    this.client.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        logger.info("terrapay_response", {
          method: String(response.config.method ?? "GET").toUpperCase(),
          url: sanitizeUrlForLog(String(response.config.url ?? "")),
          status: response.status,
          latencyMs: Date.now() - startedAt,
        });
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = sanitizeUrlForLog(String(error?.config?.url ?? ""));
        const status = Number(error?.response?.status ?? 0);
        const detail = String(
          error?.response?.data?.error?.errorDescription ??
            error?.response?.data?.message ??
            error?.message ??
            "TerraPay request failed"
        );
        logger.error("terrapay_error", { method, url, status: status || "NO_STATUS", detail });
        return Promise.reject(error);
      }
    );
  }

  supports(feature: FinancialFeature): boolean {
    return feature === "remittance";
  }

  private isMockMode(): boolean {
    return String(process.env.FINANCIAL_SANDBOX_MOCK ?? "").trim().toLowerCase() === "true";
  }

  private assertConfigured() {
    const required = ["TERRAPAY_USERNAME", "TERRAPAY_PASSWORD"];
    const missing = required.filter((key) => !String(process.env[key] ?? "").trim());
    if (missing.length > 0) {
      throw new Error(`TerraPay configuration missing: ${missing.join(", ")}`);
    }
  }

  // ── Quotation ──────────────────────────────────────────────────────────────

  async createQuotation(payload: TerraPayQuoteRequest): Promise<TerraPayQuoteResponse> {
    if (this.isMockMode()) {
      const sendingAmount = Number(payload.requestAmount) || 100;
      const fxRate = 1.0914;
      const receivingAmount = Number((sendingAmount * fxRate).toFixed(2));
      // Simulate TerraPay corridor fee: 2% of send amount (EUR→USD Zimbabwe).
      const senderFee = Number((sendingAmount * 0.02).toFixed(2));
      const quoteId = `QT-mock-${Date.now()}`;
      return {
        requestDate: payload.requestDate,
        quotes: [
          {
            quoteId,
            quoteExpiryTime: formatTerraPayDate(new Date(Date.now() + 10 * 60 * 1000)),
            sendingAmount: sendingAmount.toFixed(6),
            sendingCurrency: payload.quotes[0]?.sendingCurrency ?? payload.requestCurrency,
            receivingAmount: receivingAmount.toFixed(6),
            receivingCurrency: payload.quotes[0]?.receivingCurrency ?? "USD",
            fxRate: fxRate.toFixed(6),
            senderFee: senderFee.toFixed(2),
          } as any,
        ],
        quotationReference: quoteId,
        quotationStatus: "2000:Quote Success",
        senderFee: senderFee.toFixed(2),
      } as any;
    }

    this.assertConfigured();
    const response = await withProviderRetry(
      "createQuotation",
      () => this.client.post<TerraPayQuoteResponse>("/eig/gsma/quotations", payload)
    );
    return response.data;
  }

  // ── Transaction ────────────────────────────────────────────────────────────

  async createTransaction(payload: TerraPayTransactionRequest): Promise<TerraPayTransactionResponse> {
    if (this.isMockMode()) {
      return {
        transactionId: `TX-mock-${Date.now()}`,
        transactionStatus: "1000:Transaction Pending",
        debitParty: payload.debitParty,
        creditParty: payload.creditParty,
        requestAmount: payload.requestAmount,
        requestCurrency: payload.requestCurrency,
      };
    }

    this.assertConfigured();
    // Do not automatically retry non-idempotent money-moving requests.
    const response = await this.client.post<TerraPayTransactionResponse>(
      "/eig/gsma/transactions",
      payload
    );
    return response.data;
  }

  // ── Transaction status ─────────────────────────────────────────────────────

  async getTransactionStatus(transactionId: string): Promise<TerraPayTransactionResponse> {
    if (this.isMockMode()) {
      return {
        transactionId,
        transactionStatus: "3000:Transaction Paid",
      };
    }

    this.assertConfigured();
    const response = await withProviderRetry(
      "getTransactionStatus",
      () =>
        this.client.get<TerraPayTransactionResponse>(
          `/eig/gsma/transactions/${encodeURIComponent(transactionId)}`
        )
    );
    return response.data;
  }

  // ── Account / beneficiary verification ────────────────────────────────────

  async verifyMobileAccount(
    msisdn: string,
    beneficiaryName: string,
    senderName?: string
  ): Promise<TerraPayAccountStatusResponse> {
    if (this.isMockMode()) {
      return { status: "available", subStatus: "mock" };
    }

    this.assertConfigured();
    const params: Record<string, string> = { bnv: beneficiaryName };
    if (senderName) params.snv = senderName;

    const response = await withProviderRetry(
      "verifyMobileAccount",
      () =>
        this.client.get<TerraPayAccountStatusResponse>(
          `/eig/gsma/accounts/msisdn/${encodeURIComponent(msisdn)}/status`,
          { params }
        )
    );
    return response.data;
  }
}
