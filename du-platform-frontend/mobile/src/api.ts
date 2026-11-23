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
  let payload;
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
    try {
      payload = response.status === 204 || response.status === 205 ? null : await response.json();
    } catch (error) {
      if (controller.signal.aborted || options.signal?.aborted) throw error;
      if (response.ok) throw new ApiError("The service returned an unreadable response. Please try again.", 502, "INVALID_RESPONSE");
    }
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? "The request timed out. Please try again." : "Could not connect. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
  if (!response.ok || payload?.success === false) {
    const error: ApiErrorPayload = payload?.error || {};
    // A 2xx that reports success:false is a failed operation, not a client error.
    throw new ApiError(error.message || payload?.message || "The service is unavailable. Please try again.", response.ok ? 502 : response.status, error.code || "API_ERROR");
  }
  if (response.status === 204 || response.status === 205) return null as T;
  const hasData = payload?.success === true && Object.prototype.hasOwnProperty.call(payload, "data");
  const value = hasData ? payload.data : payload;
  // Screens render from these values, so reject an envelope without an object body.
  if (value === null || typeof value !== "object" || (payload?.success === true && !hasData))
    throw new ApiError("The service returned an invalid response. Please try again.", 502, "INVALID_RESPONSE");
  return value as T;
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function requestOnesaReply(conversation: ChatMessage[], signal: AbortSignal): Promise<string> {
  const result = await request<{ reply: string; truncated?: boolean }>("/ai/chat", {
    method: "POST",
    body: { messages: conversation.slice(-20), language: "en" },
    signal,
    timeoutMs: 30_000,
  });
  if (typeof result?.reply !== "string" || !result.reply.trim() || result.truncated) {
    throw new Error("The assistant could not complete a response. Please try again.");
  }
  return result.reply;
}

export type User = { id: number; fullName: string; email: string };
export type AuthResult = { user: User; accessToken: string; sessionToken: string };
export type Product = { id: number; slug: string; name: string; description: string; category: string; image_url: string; image_api_url?: string | null; price_cents: number; currency: string; stock_qty: number; is_active: number };
export type Readiness = { commercialReady: boolean; mode: string; enforcement: string; approvedProductIds: number[]; destinationCountries: string[] };
export type Catalog = { products: Product[]; readiness: Readiness; source: string; cached?: boolean };
export type TravelQuote = { id: string; identity: string; provider: string; category: string; title: string; price: number; currency: string; bookingUrl: string; [key: string]: unknown };
export type TravelCriteria = { origin: string; destination: string; tripType: "return" | "one-way"; departure: string; returnDate: string; adults: number; childAges: number[]; rooms: number; currency: string; pickup: string; dropoff: string; pickupTime: string; dropoffTime: string };

/** Validate values used by native filters, prices and ordering before rendering. */
export function parseCatalog(value: unknown): Catalog {
  const invalid = () => new ApiError("The catalogue response was invalid. Please try again.", 502, "INVALID_RESPONSE");
  if (!value || typeof value !== "object") throw invalid();
  const data = value as Partial<Catalog>;
  const validProduct = (product: unknown): product is Product => {
    if (!product || typeof product !== "object") return false;
    const p = product as Partial<Product>;
    return Number.isSafeInteger(p.id) && p.id! > 0
      && [p.slug, p.name, p.description, p.category, p.image_url, p.currency].every(field => typeof field === "string")
      && Number.isSafeInteger(p.price_cents) && p.price_cents! >= 0
      && Number.isSafeInteger(p.stock_qty) && p.stock_qty! >= 0
      && (p.is_active === 0 || p.is_active === 1)
      && (p.image_api_url == null || typeof p.image_api_url === "string");
  };
  const readiness = data.readiness;
  if (!Array.isArray(data.products) || !data.products.every(validProduct)
    || typeof data.source !== "string" || (data.cached !== undefined && typeof data.cached !== "boolean")
    || !readiness || typeof readiness.commercialReady !== "boolean"
    || typeof readiness.mode !== "string" || typeof readiness.enforcement !== "string"
    || !Array.isArray(readiness.approvedProductIds) || !readiness.approvedProductIds.every(id => Number.isSafeInteger(id) && id > 0)
    || !Array.isArray(readiness.destinationCountries) || !readiness.destinationCountries.every(country => typeof country === "string")) throw invalid();
  return data as Catalog;
}
