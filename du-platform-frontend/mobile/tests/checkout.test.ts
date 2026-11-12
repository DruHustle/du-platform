import { describe, expect, it } from "vitest";
import { ApiError } from "../src/api";
import { canEditRejectedRequest, readPendingOrder, type OrderPayload } from "../src/checkout";

const payload: OrderPayload = {
  items: [{ productId: 7, quantity: 2 }], currency: "EUR", language: "en", customerName: "Test Shopper",
  customerEmail: "shopper@example.test", shippingCountry: "DE", shippingCity: "Berlin", shippingAddress: "Test street 1",
  postalCode: "", customerNotes: "", deliverySpeed: "normal", paymentMethod: "manual_assisted",
  analyticsConsent: false, requestToken: "ab".repeat(32),
};

describe("native assisted-order recovery", () => {
  it("restores the original order including its grant and delivery details", () => {
    expect(readPendingOrder(JSON.stringify(payload))).toEqual(payload);
  });
  it("keeps malformed saved data out of the checkout workflow", () => {
    for (const change of [{ items: [] }, { items: [null] }, { items: [{ productId: 7, quantity: 0 }] },
      { requestToken: "broken" }, { shippingAddress: {} }, { paymentMethod: "dummy_gateway" }]) {
      expect(() => readPendingOrder(JSON.stringify({ ...payload, ...change }))).toThrow();
    }
  });
  it("unlocks a fresh pilot rejection and preserves an ambiguous previous submission", () => {
    const scope = new ApiError("Outside pilot scope", 409, "SHOP_ORDER_CREATE_FAILED");
    expect(canEditRejectedRequest(scope, false)).toBe(true);
    expect(canEditRejectedRequest(scope, true)).toBe(false);
    expect(canEditRejectedRequest(new ApiError("Invalid address", 400), true)).toBe(true);
    for (const failure of [new ApiError("Unavailable", 503), new ApiError("Unrelated conflict", 409), new Error("connection lost")]) {
      expect(canEditRejectedRequest(failure, false)).toBe(false);
    }
  });
});
