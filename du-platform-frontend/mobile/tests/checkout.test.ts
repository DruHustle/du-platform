import { describe, expect, it } from "vitest";
import { ApiError } from "../src/api";
import { canEditRejectedRequest, readPendingOrder, readQuoteAcceptance, reconcileQuoteAcceptance, type OrderPayload } from "../src/checkout";

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

describe("quote acceptance after an interrupted request", () => {
  const attempt = { ref: "DU-1", version: 3, requestId: "d04dac8a-e8d6-4914-bc07-f480a30faaa1" };
  const quote = { version: 3, stage: "quote_sent", quoteExpired: false, history: [] };
  it("restores existing native retry IDs and handles corrupt serialized attempts", () => {
    expect(readQuoteAcceptance(JSON.stringify(attempt))).toEqual(attempt);
    for (const raw of [null, "{", "null", "[]", '{"requestId":"broken"}',
      JSON.stringify({ ...attempt, requestId: "not-a-uuid" }), JSON.stringify({ ...attempt, version: -1 })])
      expect(readQuoteAcceptance(raw)).toBeNull();
  });
  it("keeps the original command for an unconfirmed acceptance on the same quote", () => {
    expect(reconcileQuoteAcceptance(attempt, attempt.ref, quote)).toBe("pending");
    expect(reconcileQuoteAcceptance(attempt, attempt.ref, { ...quote, version: 2 })).toBe("pending");
  });
  it("releases an obsolete attempt when the quote changes, expires or is withdrawn", () => {
    for (const changed of [{ version: 4 }, { quoteExpired: true }, { stage: "cancelled" }])
      expect(reconcileQuoteAcceptance(attempt, attempt.ref, { ...quote, ...changed })).toBe("changed");
  });
  it("recognises an applied command even after the order moves on", () => {
    expect(reconcileQuoteAcceptance(attempt, attempt.ref, { ...quote, version: 5, stage: "dispatched",
      history: [{ command_id: attempt.requestId }] })).toBe("applied");
  });
  it("keeps a different receipt's saved command separate", () => {
    expect(reconcileQuoteAcceptance(attempt, "DU-2", { ...quote, version: 4 })).toBe("none");
    expect(reconcileQuoteAcceptance(null, attempt.ref, quote)).toBe("none");
  });
});
