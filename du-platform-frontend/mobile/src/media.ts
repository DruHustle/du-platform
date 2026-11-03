import { API_URL, validateApiUrl } from "./api";

// Product image paths are published by the catalogue and hosted by the public
// site, which can have a different origin from the independently deployed API.
const site = validateApiUrl(process.env.EXPO_PUBLIC_WEB_URL || "https://www.diasporaunlocked.com");
export function productImageUrl(value: string, apiPath?: string | null): string | undefined {
  try {
    if (apiPath && /^\/api\/shop\/assets\/[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(apiPath))
      return new URL(apiPath, API_URL).toString();
    if (!value || value.startsWith("//") || value.includes("\\")) return undefined;
    const url = value.startsWith("/") ? new URL(value, site) : new URL(value);
    const local = ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) return undefined;
    return url.toString();
  } catch { return undefined; }
}
