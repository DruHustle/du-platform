import { ApiError } from "./api";

export type OrderPayload = {
  items: { productId: number; quantity: number }[];
  currency: string;
  language: string;
  customerName: string;
  customerEmail: string;
  shippingCountry: string;
  shippingCity: string;
  shippingAddress: string;
  postalCode: string;
  customerNotes: string;
  deliverySpeed: "normal";
  paymentMethod: "manual_assisted";
  analyticsConsent: false;
  requestToken: string;
};
export type Order = { orderRef: string; manageToken: string; status: string; currency: string; totalCents: number };

export function readPendingOrder(raw: string): OrderPayload {
  const saved = JSON.parse(raw) as OrderPayload;
  if (!Array.isArray(saved?.items) || !saved.items.length ||
      !saved.items.every(line => Number.isSafeInteger(line?.productId) && line.productId > 0 &&
        Number.isSafeInteger(line.quantity) && line.quantity > 0) ||
      ![saved.customerName, saved.customerEmail, saved.shippingCountry, saved.shippingCity, saved.shippingAddress,
        saved.postalCode, saved.customerNotes, saved.currency, saved.language].every(value => typeof value === "string") ||
      !/^[a-f0-9]{64}$/.test(saved.requestToken) || saved.deliverySpeed !== "normal" ||
      saved.paymentMethod !== "manual_assisted" || saved.analyticsConsent !== false)
    throw new Error("Could not read the saved request.");
  return saved;
}

export function canEditRejectedRequest(error: unknown, retrying: boolean): boolean {
  if (!(error instanceof ApiError)) return false;
  // Older API versions rejected requests outside the current pilot before checking
  // for a saved receipt. Retain the original token if that rejection follows a lost response.
  return error.status === 400 || (!retrying && error.status === 409 && error.code === "SHOP_ORDER_CREATE_FAILED");
}
