import { safeLocalStorage, safeSessionStorage } from "./browserStorage";
import axios, { AxiosHeaders, type InternalAxiosRequestConfig } from "axios";

const ACCESS_TOKEN_STORAGE_KEY = "du_jwt";
const HAS_LOGGED_IN_KEY = "du_has_logged_in";
const AUTH_HEADER_EXCLUDED_ENDPOINTS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/token/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/logout",
]);

let refreshPromise: Promise<string> | null = null;
let accessToken = "";

function resolveApiBaseUrl() {
  // Deployed browsers always use the host's controlled API rewrite. Preview
  // isolation must not be bypassed by a stale dashboard environment override.
  if (import.meta.env.PROD) return "/api";
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) return "/api";

  const normalized = raw.replace(/\/+$/, "");
  if (normalized.endsWith("/api")) return normalized;

  // In Vite dev, prefer relative /api so proxy settings are respected.
  if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    if (normalized === origin) return "/api";
  }

  return `${normalized}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
    // Custom-header CSRF defence: the backend requires this header to be
    // non-empty on cookie-backed POSTs.  Browsers cannot set custom headers
    // on cross-origin requests without a CORS preflight, so presence alone
    // is sufficient proof of same-origin intent.
    "X-CSRF-Token": "csrf",
  },
});

function isAuthHeaderExcludedEndpoint(requestUrl: string): boolean {
  return AUTH_HEADER_EXCLUDED_ENDPOINTS.has(requestUrl);
}

function ensureAxiosHeaders(config: InternalAxiosRequestConfig): AxiosHeaders {
  if (config.headers instanceof AxiosHeaders) {
    return config.headers;
  }

  const headers = AxiosHeaders.from(config.headers ?? {});
  config.headers = headers;
  return headers;
}

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export function markHasLoggedInBefore() {
  if (typeof window === "undefined") return;
  safeLocalStorage.setItem(HAS_LOGGED_IN_KEY, "1");
}

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") return;
  const normalized = String(token ?? "").trim();
  if (!normalized) return;
  accessToken = normalized;
  // Do not persist bearer tokens in browser storage.
  safeSessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  safeLocalStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  markHasLoggedInBefore();
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  accessToken = "";
  safeLocalStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  safeSessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function loadAuthToken(): string {
  if (typeof window === "undefined") return "";
  if (accessToken) return accessToken;

  const sessionToken = String(
    safeSessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? ""
  ).trim();
  if (sessionToken) {
    accessToken = sessionToken;
    safeSessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return sessionToken;
  }

  const localToken = String(
    safeLocalStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? ""
  ).trim();
  if (localToken) {
    accessToken = localToken;
    safeLocalStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return localToken;
  }

  return "";
}

export function hasLoggedInBefore(): boolean {
  if (typeof window === "undefined") return false;
  return safeLocalStorage.getItem(HAS_LOGGED_IN_KEY) === "1";
}

api.interceptors.request.use(config => {
  const token = loadAuthToken();
  if (!token) return config;

  const requestUrl = String(config.url ?? "");
  if (isAuthHeaderExcludedEndpoint(requestUrl)) return config;

  const headers = ensureAxiosHeaders(config);
  headers.set("Authorization", `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  response => {
    const payload = response?.data;
    if (
      payload &&
      typeof payload === "object" &&
      "success" in payload &&
      "data" in payload &&
      (payload as any).success === true
    ) {
      return { ...response, data: (payload as any).data };
    }
    return response;
  },
  async error => {
    const status = Number(error?.response?.status ?? 0);
    const config = error?.config as
      | (typeof error.config & { _retryAfterRefresh?: boolean })
      | undefined;
    const requestUrl = String(config?.url ?? "");

    if (
      status !== 401 ||
      !config ||
      config._retryAfterRefresh ||
      isAuthHeaderExcludedEndpoint(requestUrl)
    ) {
      return Promise.reject(error);
    }

    try {
      refreshPromise ??= refreshAuthTokenFromSession().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (!token) {
        return Promise.reject(error);
      }

      config._retryAfterRefresh = true;
      const headers = ensureAxiosHeaders(config as InternalAxiosRequestConfig);
      headers.set("Authorization", `Bearer ${token}`);
      return api(config);
    } catch {
      return Promise.reject(error);
    }
  }
);

export async function refreshAuthTokenFromSession(): Promise<string> {
  const response = await api.post("/auth/token/refresh");
  const token = String(response?.data?.accessToken ?? "").trim();
  if (token) saveAuthToken(token);
  return token;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "Request failed."
): string {
  const err = error as any;
  const payload = err?.response?.data;
  if (
    !err?.response &&
    ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(err?.code)
  )
    return fallback;
  const candidates = [payload?.error?.message, payload?.message, err?.message];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    accessToken = "";
    refreshPromise = null;
  });
}
