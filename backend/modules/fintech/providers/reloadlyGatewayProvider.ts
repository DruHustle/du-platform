import axios, { type AxiosInstance } from "axios";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

type OAuthCache = {
  accessToken: string;
  expiresAt: number;
};

const oauthCacheByAudience = new Map<string, OAuthCache>();

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

export type ReloadlyUtilityPaymentRequest = {
  amount: number;
  billerId: number;
  subscriberAccountNumber: string;
  referenceId: string;
  useLocalAmount?: boolean;
};

export class ReloadlyProvider implements FinancialProvider {
  readonly providerName = "reloadly";
  private readonly apiClient: AxiosInstance;
  private readonly utilitiesClient: AxiosInstance;
  private readonly authClient: AxiosInstance;
  private readonly topupsAudience: string;
  private readonly utilitiesAudience: string;

  constructor() {
    const baseURL = String(process.env.RELOADLY_BASE_URL ?? "https://topups-sandbox.reloadly.com").replace(/\/+$/, "");
    const utilitiesBaseURL = String(process.env.RELOADLY_UTILITIES_BASE_URL ?? "https://utilities-sandbox.reloadly.com").replace(
      /\/+$/,
      ""
    );
    const authURL = String(process.env.RELOADLY_AUTH_URL ?? "https://auth.reloadly.com").replace(/\/+$/, "");
    this.topupsAudience = resolveReloadlyAudience(process.env.RELOADLY_AUDIENCE, baseURL, "https://topups.reloadly.com");
    this.utilitiesAudience = resolveReloadlyAudience(
      process.env.RELOADLY_UTILITIES_AUDIENCE,
      utilitiesBaseURL,
      "https://utilities.reloadly.com"
    );

    this.apiClient = axios.create({
      baseURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/com.reloadly.topups-v1+json",
      },
    });

    this.utilitiesClient = axios.create({
      baseURL: utilitiesBaseURL,
      timeout: 20_000,
      headers: {
        "Content-Type": "application/json",
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
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
      console.info(`[reloadly:req] ${String(config.method ?? "GET").toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    });

    this.apiClient.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        const latencyMs = Date.now() - startedAt;
        console.info(
          `[reloadly:res] ${String(response.config.method ?? "GET").toUpperCase()} ${response.config.url} -> ${response.status} (${latencyMs}ms)`
        );
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = String(error?.config?.url ?? "");
        const status = Number(error?.response?.status ?? 0);
        const detail = String(error?.response?.data?.message ?? error?.message ?? "Reloadly request failed");
        console.error(`[reloadly:err] ${method} ${url} -> ${status || "NO_STATUS"} ${detail}`);
        return Promise.reject(error);
      }
    );

    this.utilitiesClient.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken(this.utilitiesAudience);
      (config as any).metadata = { startedAt: Date.now() };
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
      console.info(`[reloadly-utilities:req] ${String(config.method ?? "GET").toUpperCase()} ${config.baseURL}${config.url}`);
      return config;
    });

    this.utilitiesClient.interceptors.response.use(
      (response) => {
        const startedAt = Number((response.config as any)?.metadata?.startedAt ?? Date.now());
        const latencyMs = Date.now() - startedAt;
        console.info(
          `[reloadly-utilities:res] ${String(response.config.method ?? "GET").toUpperCase()} ${response.config.url} -> ${response.status} (${latencyMs}ms)`
        );
        return response;
      },
      (error) => {
        const method = String(error?.config?.method ?? "GET").toUpperCase();
        const url = String(error?.config?.url ?? "");
        const status = Number(error?.response?.status ?? 0);
        const detail = String(error?.response?.data?.message ?? error?.message ?? "Reloadly utility request failed");
        console.error(`[reloadly-utilities:err] ${method} ${url} -> ${status || "NO_STATUS"} ${detail}`);
        return Promise.reject(error);
      }
    );
  }

  supports(feature: FinancialFeature): boolean {
    return feature === "airtime" || feature === "utility";
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

    const response = await this.authClient.post("/oauth/token", {
      client_id: String(process.env.RELOADLY_CLIENT_ID ?? "").trim(),
      client_secret: String(process.env.RELOADLY_CLIENT_SECRET ?? "").trim(),
      grant_type: "client_credentials",
      audience,
    });

    const accessToken = String(response.data?.access_token ?? "").trim();
    const expiresIn = Number(response.data?.expires_in ?? 60);

    if (!accessToken) throw new Error("Reloadly OAuth token was empty.");

    const nextCacheValue = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };
    oauthCacheByAudience.set(audience, nextCacheValue);

    return nextCacheValue.accessToken;
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
    const response = await this.apiClient.get(
      `/operators/auto-detect/phone/${encodeURIComponent(phoneNumber)}/country-code/${encodeURIComponent(countryCode)}`,
      {
        params: {
          includeBundles: true,
        },
      }
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
    const response = await this.apiClient.get(`/operators/${operatorId}`);
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
    const response = await this.apiClient.post("/topups", payload);
    return response.data;
  }

  async listUtilityBillers(filters: { countryISOCode?: string; serviceType?: string; type?: string }): Promise<any[]> {
    if (this.isMockMode()) {
      return [
        {
          id: 1001,
          name: "ZETDC Prepaid Electricity",
          countryISOCode: filters.countryISOCode ?? "ZW",
          type: filters.type ?? "ELECTRICITY_BILL_PAYMENT",
          serviceType: filters.serviceType ?? "PREPAID",
          internationalAmountSupported: true,
          internationalTransactionCurrencyCode: "EUR",
          internationalTransactionFee: 0,
          fx: {
            rate: 5180.532259792,
            currencyCode: "EUR",
          },
          localTransactionCurrencyCode: null,
        },
      ];
    }

    const response = await this.utilitiesClient.get("/billers", {
      params: {
        countryISOCode: filters.countryISOCode,
        serviceType: filters.serviceType,
        type: filters.type,
      },
    });

    const payload = response.data;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.content)) return payload.content;
    if (Array.isArray(payload?.billers)) return payload.billers;
    return [];
  }

  async payUtility(payload: ReloadlyUtilityPaymentRequest): Promise<any> {
    if (this.isMockMode()) {
      return {
        transactionId: `UT-${payload.referenceId.slice(0, 8)}`,
        status: "COMPLETED",
        amount: payload.amount,
        billerId: payload.billerId,
        subscriberAccountNumber: payload.subscriberAccountNumber,
        token: "1234-5678-9012",
        referenceId: payload.referenceId,
      };
    }

    const response = await this.utilitiesClient.post("/pay", {
      amount: payload.amount,
      billerId: payload.billerId,
      subscriberAccountNumber: payload.subscriberAccountNumber,
      referenceId: payload.referenceId,
      useLocalAmount: payload.useLocalAmount ?? false,
    });
    return response.data;
  }
}
