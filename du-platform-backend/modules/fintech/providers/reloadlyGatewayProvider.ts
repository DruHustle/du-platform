import axios, {
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { logger } from "../../../core/logger";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

/** Mask phone numbers and card-like digit strings in URLs before logging to prevent PII leakage. */
function sanitizeUrlForLog(url: string): string {
  return url
    .replace(/\/phone\/(\+?\d{3,4})\d+/g, "/phone/$1****")
    .replace(/\/(\d{4})\d{8,}(\d{4})/g, "/$1****$2");
}

type OAuthCache = {
  accessToken: string;
  expiresAt: number;
};

const oauthCacheByAudience = new Map<string, OAuthCache>();
/** Tracks in-flight token requests — prevents concurrent duplicate OAuth calls for the same audience. */
const oauthInflightByAudience = new Map<string, Promise<string>>();

export function resolveReloadlyAudience(
  explicitAudience: string | undefined,
  baseUrl: string,
  fallbackAudience: string
): string {
  const normalizedExplicit = String(explicitAudience ?? "").trim();
  if (normalizedExplicit) return normalizedExplicit;

  try {
    return new URL(baseUrl).origin;
  } catch {
    return fallbackAudience;
  }
}

export type ReloadlyTopupRequest = {
  operatorId: number;
  amount: number;
  useLocalAmount?: boolean;
  recipientPhone: {
    countryCode: string;
    number: string;
  };
  customIdentifier: string;
};

function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  if (config.headers instanceof AxiosHeaders) {
    return config.headers;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  config.headers = headers;
  return headers;
}

function shouldRetryReloadlyError(error: unknown): boolean {
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

async function withReloadlyRetry<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  let delayMs = 250;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= 3 || !shouldRetryReloadlyError(error)) {
        throw error;
      }

      logger.warn('reloadly_retry', {
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

export class ReloadlyProvider implements FinancialProvider {
  readonly providerName = "reloadly";
  readonly displayName = "Reloadly";
  private readonly apiClient: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly topupsAudience: string;

  constructor() {
    const baseURL = String(process.env.RELOADLY_BASE_URL ?? "https://topups-sandbox.reloadly.com").replace(/\/+$/, "");
    const authURL = String(process.env.RELOADLY_AUTH_URL ?? "https://auth.reloadly.com").replace(/\/+$/, "");
    this.topupsAudience = resolveReloadlyAudience(process.env.RELOADLY_AUDIENCE, baseURL, "https://topups.reloadly.com");

    this.apiClient = axios.create({
      baseURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/com.reloadly.topups-v1+json",
      },
    });

    this.authClient = axios.create({
      baseURL: authURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.apiClient.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken(this.topupsAudience);
      (config as any).metadata = { startedAt: Date.now() };
      const headers = ensureAxiosHeaders(config);
      headers.set("Authorization", `Bearer ${token}`);
      logger.info("reloadly_request", {
        method: String(config.method ?? "GET").toUpperCase(),
        url: sanitizeUrlForLog(`${config.baseURL ?? ""}${config.url ?? ""}`),
      });
      return config;
    });

    this.apiClient.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        const latencyMs = Date.now() - startedAt;
        logger.info("reloadly_response", { method: String(response.config.method ?? "GET").toUpperCase(), url: sanitizeUrlForLog(String(response.config.url ?? "")), status: response.status, latencyMs });
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = sanitizeUrlForLog(String(error?.config?.url ?? ""));
        const status = Number(error?.response?.status ?? 0);
        const detail = String(error?.response?.data?.message ?? error?.message ?? "Reloadly request failed");
        logger.error("reloadly_error", { method, url, status: status || "NO_STATUS", detail });
        return Promise.reject(error);
      }
    );
  }

  supports(feature: FinancialFeature): boolean {
    return feature === "airtime";
  }

  private isMockMode(): boolean {
    return String(process.env.FINANCIAL_SANDBOX_MOCK ?? "")
      .trim()
      .toLowerCase() === "true";
  }

  private assertConfigured() {
    const required = ["RELOADLY_CLIENT_ID", "RELOADLY_CLIENT_SECRET"];
    const missing = required.filter((key) => !String(process.env[key] ?? "").trim());
    if (missing.length > 0) {
      throw new Error(`Reloadly configuration missing: ${missing.join(", ")}`);
    }
  }

  async getAccessToken(audience = this.topupsAudience): Promise<string> {
    if (this.isMockMode()) {
      const cachedMockToken = oauthCacheByAudience.get(audience);
      if (cachedMockToken && cachedMockToken.expiresAt > Date.now() + 30_000) {
        return cachedMockToken.accessToken;
      }
      const mockToken = {
        accessToken: "reloadly-mock-token",
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      oauthCacheByAudience.set(audience, mockToken);
      return mockToken.accessToken;
    }

    this.assertConfigured();

    const cachedToken = oauthCacheByAudience.get(audience);
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
      return cachedToken.accessToken;
    }

    // Deduplicate concurrent token requests for the same audience.
    const inflight = oauthInflightByAudience.get(audience);
    if (inflight) return inflight;

    const tokenRequest = withReloadlyRetry(
      "oauthToken",
      () =>
        this.authClient.post("/oauth/token", {
          client_id: String(process.env.RELOADLY_CLIENT_ID ?? "").trim(),
          client_secret: String(process.env.RELOADLY_CLIENT_SECRET ?? "").trim(),
          grant_type: "client_credentials",
          audience,
        })
    )
      .then((response) => {
        const accessToken = String(response.data?.access_token ?? "").trim();
        const expiresIn = Number(response.data?.expires_in ?? 0);

        if (!accessToken) throw new Error("Reloadly OAuth token was empty.");
        if (!Number.isFinite(expiresIn) || expiresIn < 60) {
          throw new Error(`Reloadly OAuth returned invalid expires_in: ${expiresIn}`);
        }

        const cached = { accessToken, expiresAt: Date.now() + expiresIn * 1000 };
        oauthCacheByAudience.set(audience, cached);
        return accessToken;
      })
      .finally(() => {
        oauthInflightByAudience.delete(audience);
      });

    oauthInflightByAudience.set(audience, tokenRequest);
    return tokenRequest;
  }

  async detectOperator(phoneNumber: string, countryCode = "ZW"): Promise<any> {
    if (this.isMockMode()) {
      return {
        operatorId: 2714,
        name: "Econet Zimbabwe",
        countryCode,
        phoneNumber,
        senderCurrencyCode: "EUR",
        destinationCurrencyCode: "USD",
        fx: {
          rate: 1.16820928703,
          currencyCode: "USD",
        },
      };
    }
    const params = { includeBundles: true };
    try {
      const response = await withReloadlyRetry(
        "detectOperator",
        () =>
          this.apiClient.get(
            `/operators/auto-detect/phone/${encodeURIComponent(phoneNumber)}/countries/${encodeURIComponent(countryCode)}`,
            { params }
          )
      );
      return response.data;
    } catch (error: any) {
      if (Number(error?.response?.status ?? 0) !== 404) {
        throw error;
      }
      const fallbackResponse = await withReloadlyRetry(
        "detectOperatorFallback",
        () =>
          this.apiClient.get(
            `/operators/auto-detect/phone/${encodeURIComponent(phoneNumber)}/country-code/${encodeURIComponent(countryCode)}`,
            { params }
          )
      );
      return fallbackResponse.data;
    }
  }

  async listOperatorsByCountry(countryCode = "ZW"): Promise<any[]> {
    if (this.isMockMode()) {
      return [
        {
          operatorId: 2714,
          id: 2714,
          name: "Econet Zimbabwe",
          countryCode,
          senderCurrencyCode: "EUR",
          destinationCurrencyCode: "USD",
          fx: {
            rate: 1.16820928703,
            currencyCode: "USD",
          },
          suggestedAmounts: [1, 2, 5, 10, 20, 50],
        },
      ];
    }

    const response = await withReloadlyRetry(
      "listOperatorsByCountry",
      () => this.apiClient.get(`/operators/countries/${encodeURIComponent(countryCode)}`)
    );
    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.operators)) return payload.operators;
    return [];
  }

  async fetchOperatorFxRate(operatorId: number, amount: number): Promise<any> {
    if (this.isMockMode()) {
      return {
        operatorId,
        fxRate: Number((amount * 1.16820928703).toFixed(6)),
        currencyCode: "USD",
        amount,
      };
    }
    const response = await withReloadlyRetry(
      "fetchOperatorFxRate",
      () =>
        this.apiClient.post("/operators/fx-rate", {
          operatorId,
          amount,
        })
    );
    return response.data;
  }

  async getOperatorById(operatorId: number): Promise<any> {
    if (this.isMockMode()) {
      return {
        id: operatorId,
        operatorId,
        name: "Econet Zimbabwe",
        senderCurrencyCode: "EUR",
        destinationCurrencyCode: "USD",
        minAmount: 1,
        maxAmount: 100,
        localAmountSupported: true,
        fee: 0.2,
        fx: {
          rate: 1.16820928703,
          currencyCode: "USD",
        },
        suggestedAmounts: [1, 2, 5, 10, 20, 50],
      };
    }
    const response = await withReloadlyRetry(
      "getOperatorById",
      () => this.apiClient.get(`/operators/${operatorId}`)
    );
    return response.data;
  }

  async createTopup(payload: ReloadlyTopupRequest): Promise<any> {
    if (this.isMockMode()) {
      const fee = Number((payload.amount * 0.02).toFixed(2));
      return {
        transactionId: `AT-${payload.customIdentifier.slice(0, 8)}`,
        status: "COMPLETED",
        operatorId: payload.operatorId,
        amount: payload.amount,
        useLocalAmount: payload.useLocalAmount ?? false,
        fee,
        totalAmount: Number((payload.amount + fee).toFixed(2)),
        recipientPhone: payload.recipientPhone,
      };
    }
    // Do not automatically retry non-idempotent money-moving requests.
    const response = await this.apiClient.post("/topups", payload);
    return response.data;
  }
}
