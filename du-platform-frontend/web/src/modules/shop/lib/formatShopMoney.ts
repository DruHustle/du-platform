export function formatShopMoney(cents: number, currency = "EUR") {
  if (!Number.isFinite(cents)) return "Price unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
