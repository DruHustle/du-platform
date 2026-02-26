import axios, { type AxiosInstance } from "axios";
import type { FinancialFeature, FinancialProvider } from "./providerTypes";

type OAuthCache = {
  accessToken: string;
  expiresAt: number;
};

let oauthCache: OAuthCache | null = null;

export type ReloadlyTopupRequest = {
  operatorId: number;
  amount: number;
  recipientPhone: {
    countryCode: string;
    number: string;
  };
  customIdentifier: string;
};

export class ReloadlyProvider implements FinancialProvider {
  readonly providerName = "reloadly";
  private readonly apiClient: AxiosInstance;
  private readonly authClient: AxiosInstance;

  constructor() {
    const baseURL = String(process.env.RELOADLY_BASE_URL ?? "https://topups-sandbox.reloadly.com").replace(/\/+$/, "");
    const authURL = String(process.env.RELOADLY_AUTH_URL ?? "https://auth.reloadly.com").replace(/\/+$/, "");

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
      const token = await this.getAccessToken();
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

  async getAccessToken(): Promise<string> {
    if (this.isMockMode()) {
      if (oauthCache && oauthCache.expiresAt > Date.now() + 30_000) {
        return oauthCache.accessToken;
      }
      oauthCache = {
        accessToken: "reloadly-mock-token",
        expiresAt: Date.now() + 60 * 60 * 1000,
      };
      return oauthCache.accessToken;
    }

    this.assertConfigured();

    if (oauthCache && oauthCache.expiresAt > Date.now() + 30_000) {
      return oauthCache.accessToken;
    }

    const response = await this.authClient.post("/oauth/token", {
      client_id: String(process.env.RELOADLY_CLIENT_ID ?? "").trim(),
      client_secret: String(process.env.RELOADLY_CLIENT_SECRET ?? "").trim(),
      grant_type: "client_credentials",
      audience: String(process.env.RELOADLY_AUDIENCE ?? "https://topups.reloadly.com"),
    });

    const accessToken = String(response.data?.access_token ?? "").trim();
    const expiresIn = Number(response.data?.expires_in ?? 60);

    if (!accessToken) throw new Error("Reloadly OAuth token was empty.");

    oauthCache = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return accessToken;
  }

  async detectOperator(phoneNumber: string, countryCode = "ZW"): Promise<any> {
    if (this.isMockMode()) {
      return {
        operatorId: 2714,
        name: "Econet Zimbabwe",
        countryCode,
        phoneNumber,
      };
    }
    const response = await this.apiClient.get(
      `/operators/auto-detect/phone/${encodeURIComponent(phoneNumber)}/countries/${encodeURIComponent(countryCode)}`
    );
    return response.data;
  }

  async getOperatorById(operatorId: number): Promise<any> {
    if (this.isMockMode()) {
      return {
        id: operatorId,
        name: "Econet Zimbabwe",
        minAmount: 1,
        maxAmount: 100,
        localAmountSupported: true,
        fee: 0.2,
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
        fee,
        totalAmount: Number((payload.amount + fee).toFixed(2)),
        recipientPhone: payload.recipientPhone,
      };
    }
    const response = await this.apiClient.post("/topups", payload);
    return response.data;
  }
}
