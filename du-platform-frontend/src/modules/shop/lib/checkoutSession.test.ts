import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
const storage = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
const order = {
  orderRef: "DU-LOCAL-TEST",
  status: "awaiting_payment",
  paymentMethod: "manual_assisted",
  currency: "EUR",
  subtotalCents: 6900,
  shippingCents: 1200,
  totalCents: 8100,
  deliverySpeed: "normal",
  manageToken: "a".repeat(64),
} as const;
describe("checkout session recovery", () => {
  it("reuses a private grant after a timeout or reload without storing contact details", async () => {
    const checkout = await import("./checkoutSession");
    const payload = {
      customerEmail: "private@example.test",
      items: [{ productId: 1, quantity: 1 }],
    };
    const token = await checkout.prepareCheckoutAttempt(payload);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(await checkout.prepareCheckoutAttempt(payload)).toBe(token);
    expect([...storage.values()].join()).not.toContain(payload.customerEmail);
    vi.resetModules();
    const reloaded = await import("./checkoutSession");
    expect(await reloaded.prepareCheckoutAttempt(payload)).toBe(token);
    expect(
      await reloaded.prepareCheckoutAttempt({
        ...payload,
        items: [{ productId: 1, quantity: 2 }],
      })
    ).not.toBe(token);
  });
  it("restores validated receipts, clears the completed attempt and rejects malformed totals", async () => {
    const checkout = await import("./checkoutSession");
    await checkout.prepareCheckoutAttempt({ items: [1] });
    checkout.saveOrderReceipt(order);
    expect(storage.has("du_shop_attempt_v1")).toBe(false);
    vi.resetModules();
    const reloaded = await import("./checkoutSession");
    expect(reloaded.readOrderReceipt()).toEqual(order);
    expect(reloaded.isOrderReceipt({ ...order, totalCents: 1 })).toBe(false);
    expect(
      reloaded.isOrderReceipt({ ...order, manageToken: "guessable" })
    ).toBe(false);
  });
  it("survives blocked storage and malformed saved state", async () => {
    storage.set("du_shop_attempt_v1", "{");
    storage.set("du_shop_receipt_v1", "{");
    const checkout = await import("./checkoutSession");
    expect(checkout.readOrderReceipt()).toBeNull();
    vi.stubGlobal("window", {
      get sessionStorage() {
        throw new Error("Storage blocked");
      },
    });
    const token = await checkout.prepareCheckoutAttempt({ items: [1] });
    expect(await checkout.prepareCheckoutAttempt({ items: [1] })).toBe(token);
    checkout.saveOrderReceipt(order);
    expect(checkout.readOrderReceipt()).toEqual(order);
  });
});
