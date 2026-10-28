export const SHOP_CURRENCIES = ["EUR", "USD", "ZAR"] as const;
export type ShopCurrency = (typeof SHOP_CURRENCIES)[number];

// Fixed, reviewed reference rates keep catalogue, checkout and saved requests
// consistent. These are indicative prices, not a live foreign-exchange service.
// https://www.ecb.europa.eu/stats/exchange/eurofxref/shared/pdf/2026/10/20261015.pdf
export const SHOP_PRICING_REVISION = "ecb-2026-10-15";
export const SHOP_RATES_PER_EUR = {
  EUR: 1,
  USD: 1.1208,
  ZAR: 18.5569,
} as const;

export function isShopCurrency(value: unknown): value is ShopCurrency {
  return SHOP_CURRENCIES.includes(value as ShopCurrency);
}

export function convertShopCents(
  cents: number,
  from: string,
  to: ShopCurrency
): number {
  if (!isShopCurrency(from) || !Number.isSafeInteger(cents) || cents < 0)
    throw new Error("Unsupported shop price.");
  const converted = Math.round(
    (cents / SHOP_RATES_PER_EUR[from]) * SHOP_RATES_PER_EUR[to]
  );
  if (!Number.isSafeInteger(converted))
    throw new Error("Shop price is too large.");
  return converted;
}

export function currencyForTimeZone(timeZone: string): ShopCurrency {
  if (["Africa/Harare", "Africa/Salisbury"].includes(timeZone)) return "USD";
  if (
    ["Africa/Johannesburg", "Africa/Maseru", "Africa/Mbabane"].includes(
      timeZone
    )
  )
    return "ZAR";
  return "EUR";
}
