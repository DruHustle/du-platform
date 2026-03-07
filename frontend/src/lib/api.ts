import axios from "axios";

const HAS_LOGGED_IN_KEY = "zigd_has_logged_in";
const SESSION_AUTH_ENDPOINTS = new Set([
  "/auth/me",
  "/auth/login",
  "/auth/register",
  "/auth/token/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/kyc/verify",
  "/auth/logout",
]);

let refreshPromise: Promise<string> | null = null;

function resolveApiBaseUrl() {
  const raw = String(import.meta.env.VITE_API_URL ?? "").trim();
  if (!raw) return "/api";

  const normalized = raw.replace(/\/+$/, "");
  if (normalized.endsWith("/api")) return normalized;

  // In Vite dev, prefer relative /api so proxy settings are respected.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    if (normalized === origin) return "/api";
  }

  return `${normalized}/api`;
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function isSessionAuthEndpoint(requestUrl: string): boolean {
  return SESSION_AUTH_ENDPOINTS.has(requestUrl);
}

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") return;
  const normalized = String(token ?? "").trim();
  if (!normalized) return;
  // Store access tokens in sessionStorage (tab-scoped) to reduce persistence risk.
  window.sessionStorage.setItem("zigd_jwt", normalized);
  window.localStorage.removeItem("zigd_jwt");
  window.localStorage.setItem(HAS_LOGGED_IN_KEY, "1");
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("zigd_jwt");
  window.sessionStorage.removeItem("zigd_jwt");
}

export function loadAuthToken(): string {
  if (typeof window === "undefined") return "";
  const sessionToken = String(window.sessionStorage.getItem("zigd_jwt") ?? "").trim();
  if (sessionToken) return sessionToken;

  // Backward compatibility: migrate legacy localStorage tokens once.
  const legacyLocalToken = String(window.localStorage.getItem("zigd_jwt") ?? "").trim();
  if (legacyLocalToken) {
    window.sessionStorage.setItem("zigd_jwt", legacyLocalToken);
    window.localStorage.removeItem("zigd_jwt");
    return legacyLocalToken;
  }

  return "";
}

export function hasLoggedInBefore(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HAS_LOGGED_IN_KEY) === "1";
}

api.interceptors.request.use((config) => {
  const token = loadAuthToken();
  if (!token) return config;

  const requestUrl = String(config.url ?? "");
  if (isSessionAuthEndpoint(requestUrl)) return config;

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
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
  async (error) => {
    const status = Number(error?.response?.status ?? 0);
    const config = error?.config as (typeof error.config & { _retryAfterRefresh?: boolean }) | undefined;
    const requestUrl = String(config?.url ?? "");

    if (
      status !== 401 ||
      !config ||
      config._retryAfterRefresh ||
      isSessionAuthEndpoint(requestUrl) ||
      !hasLoggedInBefore()
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
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
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

export function getApiErrorMessage(error: unknown, fallback = "Request failed."): string {
  const err = error as any;
  const payload = err?.response?.data;
  const candidates = [payload?.error?.message, payload?.message, err?.message];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}
