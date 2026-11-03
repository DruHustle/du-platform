export type ApiErrorPayload = { code?: string; message?: string };
export class ApiError extends Error {
  constructor(message: string, public status = 0, public code = "NETWORK_ERROR") {
    super(message);
    this.name = "ApiError";
  }
}

export function validateApiUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("EXPO_PUBLIC_API_URL must be a valid URL."); }
  const local = ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(local && url.protocol === "http:")))
    throw new Error("The API URL must use HTTPS, except for a local development server.");
  return url.toString().replace(/\/$/, "");
}

// This is a public origin, never a credential. Native clients use the same
// controlled API proxy as browsers, or a separately configured test backend.
export const API_URL = validateApiUrl(process.env.EXPO_PUBLIC_API_URL || "https://www.diasporaunlocked.com/api");

export async function request<T>(path: string, options: {
  method?: "GET" | "POST" | "DELETE" | "PUT";
  body?: unknown;
  token?: string;
  orderToken?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
} = {}): Promise<T> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("#")) throw new Error("Invalid API path");
  const base = new URL(API_URL);
  const endpoint = new URL(API_URL + path);
  if (endpoint.origin !== base.origin || !endpoint.pathname.startsWith(`${base.pathname.replace(/\/$/, "")}/`)) throw new Error("Invalid API path");
  let response: Response;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15_000);
  try {
    response = await fetch(endpoint.toString(), {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.orderToken ? { "X-Order-Access-Token": options.orderToken } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "omit",
      signal: controller.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(controller.signal.aborted ? "The request timed out. Please try again." : "Could not connect. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error: ApiErrorPayload = payload?.error || {};
    throw new ApiError(error.message || payload?.message || "The service is unavailable. Please try again.", response.status, error.code || "API_ERROR");
  }
  return (payload?.success === true && "data" in payload ? payload.data : payload) as T;
}

export type User = { id: number; fullName: string; email: string };
export type AuthResult = { user: User; accessToken: string; sessionToken: string };
export type Product = { id: number; slug: string; name: string; description: string; category: string; image_url: string; image_api_url?: string | null; price_cents: number; currency: string; stock_qty: number; is_active: number };
export type Readiness = { commercialReady: boolean; mode: string; enforcement: string; approvedProductIds: number[]; destinationCountries: string[] };
export type Catalog = { products: Product[]; readiness: Readiness; source: string; cached?: boolean };
export type TravelQuote = { id: string; identity: string; provider: string; category: string; title: string; price: number; currency: string; bookingUrl: string; [key: string]: unknown };
export type TravelCriteria = { origin: string; destination: string; tripType: "return" | "one-way"; departure: string; returnDate: string; adults: number; childAges: number[]; rooms: number; currency: string; pickup: string; dropoff: string; pickupTime: string; dropoffTime: string };
