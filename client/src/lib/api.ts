import axios from "axios";

const HAS_LOGGED_IN_KEY = "zigd_has_logged_in";

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

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export function saveAuthToken(token: string) {
  if (typeof window === "undefined") return;
  const normalized = String(token ?? "").trim();
  if (!normalized) return;
  window.localStorage.setItem("zigd_jwt", normalized);
  window.localStorage.setItem(HAS_LOGGED_IN_KEY, "1");
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("zigd_jwt");
  window.sessionStorage.removeItem("zigd_jwt");
}

export function loadAuthToken(): string {
  if (typeof window === "undefined") return "";
  return (
    String(window.localStorage.getItem("zigd_jwt") ?? "").trim() ||
    String(window.sessionStorage.getItem("zigd_jwt") ?? "").trim()
  );
}

export function hasLoggedInBefore(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(HAS_LOGGED_IN_KEY) === "1";
}

api.interceptors.request.use((config) => {
  const token = loadAuthToken();
  if (!token) return config;

  const requestUrl = String(config.url ?? "");
  const isSessionAuthEndpoint =
    requestUrl === "/auth/me" ||
    requestUrl === "/auth/login" ||
    requestUrl === "/auth/register" ||
    requestUrl === "/auth/token/refresh" ||
    requestUrl === "/auth/forgot-password" ||
    requestUrl === "/auth/reset-password" ||
    requestUrl === "/auth/kyc/verify";
  if (isSessionAuthEndpoint) return config;

  config.headers = config.headers ?? {};
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
