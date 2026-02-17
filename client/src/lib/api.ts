import axios from "axios";

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

export function loadAuthToken() {}
