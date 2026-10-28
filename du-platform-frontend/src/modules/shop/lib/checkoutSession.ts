import { isShopCurrency } from "@/contracts/shopCurrency";
import { safeSessionStorage } from "@/lib/browserStorage";

export type OrderReceipt = {
  orderRef: string;
  status: string;
  paymentMethod: "manual_assisted" | "dummy_gateway";
  paymentReference?: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  deliverySpeed: "normal" | "express";
  manageToken: string;
  items?: Array<{
    productId: number;
    productName: string;
    quantity: number;
    lineTotalCents: number;
  }>;
};
const ATTEMPT_KEY = "du_shop_attempt_v1";
const RECEIPT_KEY = "du_shop_receipt_v1";
let attempt: { fingerprint: string; requestToken: string } | null = null;
let receipt: OrderReceipt | null = null;

export function isOrderReceipt(value: unknown): value is OrderReceipt {
  const order = value as OrderReceipt | null;
  return Boolean(
    order &&
      /^DU-[A-Z0-9-]+$/.test(order.orderRef) &&
      ["awaiting_payment", "paid", "failed"].includes(order.status) &&
      ["manual_assisted", "dummy_gateway"].includes(order.paymentMethod) &&
      /^[a-f0-9]{64}$/.test(order.manageToken) &&
      isShopCurrency(order.currency) &&
      [order.subtotalCents, order.shippingCents, order.totalCents].every(
        amount => Number.isSafeInteger(amount) && amount >= 0
      ) &&
      order.totalCents === order.subtotalCents + order.shippingCents &&
      ["normal", "express"].includes(order.deliverySpeed) &&
      (order.items === undefined ||
        (Array.isArray(order.items) &&
          order.items.every(
            item =>
              item &&
              Number.isSafeInteger(item.productId) &&
              item.productId > 0 &&
              typeof item.productName === "string" &&
              Number.isSafeInteger(item.quantity) &&
              item.quantity > 0 &&
              Number.isSafeInteger(item.lineTotalCents) &&
              item.lineTotalCents >= 0
          )))
  );
}

export function readOrderReceipt(): OrderReceipt | null {
  try {
    const saved = JSON.parse(safeSessionStorage.getItem(RECEIPT_KEY) || "null");
    if (isOrderReceipt(saved)) receipt = saved;
  } catch {
    /* A corrupt receipt must never prevent shopping. */
  }
  return receipt;
}
export function saveOrderReceipt(order: OrderReceipt) {
  receipt = order;
  // Tab-scoped: no customer name, email or delivery address is persisted.
  safeSessionStorage.setItem(RECEIPT_KEY, JSON.stringify(order));
  attempt = null;
  safeSessionStorage.removeItem(ATTEMPT_KEY);
}
export async function prepareCheckoutAttempt(
  payload: unknown
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const fingerprint = Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  if (!attempt) {
    try {
      attempt = JSON.parse(safeSessionStorage.getItem(ATTEMPT_KEY) || "null");
    } catch {
      /* Optional storage. */
    }
  }
  if (
    attempt?.fingerprint !== fingerprint ||
    !/^[a-f0-9]{64}$/.test(attempt.requestToken)
  ) {
    attempt = {
      fingerprint,
      requestToken: Array.from(
        crypto.getRandomValues(new Uint8Array(32)),
        byte => byte.toString(16).padStart(2, "0")
      ).join(""),
    };
    safeSessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  }
  return attempt.requestToken;
}
