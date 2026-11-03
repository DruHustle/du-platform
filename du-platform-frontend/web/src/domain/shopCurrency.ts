// Client types and display helpers. Rates and delivery policy come from the API.
export const SHOP_CURRENCIES = ["EUR", "USD", "ZAR"] as const;
export type ShopCurrency = (typeof SHOP_CURRENCIES)[number];
export type ShopPricing = {
  revision: string;
  ratesPerEur: Record<ShopCurrency, number>;
  shipping: { freeAboveCents: number; normalCents: number; expressCents: number };
};
let pricing: ShopPricing | null = null;
export function parseShopPricing(value: unknown): ShopPricing | null {
  const p = value as ShopPricing | null;
  if (!p || typeof p.revision !== "string" || !p.revision || !p.ratesPerEur || !p.shipping ||
    !SHOP_CURRENCIES.every(c => Number.isFinite(p.ratesPerEur[c]) && p.ratesPerEur[c] > 0) ||
    ![p.shipping.freeAboveCents,p.shipping.normalCents,p.shipping.expressCents].every(v => Number.isSafeInteger(v) && v >= 0)) return null;
  return p;
}
export function setShopPricing(value: ShopPricing | null) { pricing = value; }
export function isShopCurrency(value: unknown): value is ShopCurrency {
  return SHOP_CURRENCIES.includes(value as ShopCurrency);
}
export function convertShopCents(cents: number, from: string, to: ShopCurrency): number {
  if (!isShopCurrency(from) || !Number.isSafeInteger(cents) || cents < 0) throw new Error("Unsupported shop price.");
  if (from === to) return cents;
  if (!pricing) return Number.NaN;
  const converted = Math.round((cents / pricing.ratesPerEur[from]) * pricing.ratesPerEur[to]);
  if (!Number.isSafeInteger(converted)) throw new Error("Shop price is too large.");
  return converted;
}
export function calculateShopShippingCents(subtotalCents: number, deliverySpeed: "normal" | "express") {
  if (!pricing || !Number.isFinite(subtotalCents)) return Number.NaN;
  if (subtotalCents <= 0) return 0;
  return (subtotalCents >= pricing.shipping.freeAboveCents ? 0 : pricing.shipping.normalCents) + (deliverySpeed === "express" ? pricing.shipping.expressCents : 0);
}
export function currencyForTimeZone(timeZone: string): ShopCurrency {
  if (["Africa/Harare", "Africa/Salisbury"].includes(timeZone)) return "USD";
  if (["Africa/Johannesburg", "Africa/Maseru", "Africa/Mbabane"].includes(timeZone)) return "ZAR";
  return "EUR";
}
