import { afterEach, describe, expect, it, vi } from "vitest";
import { prepareTravelChatDraft, consumeTravelChatDraft } from "./chatHandoff";
import { defaultTravelCriteria, type TravelQuote } from "@/contracts/travel";
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
  });
  return data;
}
const quote: TravelQuote = {
  id: "00000000-0000-4000-8000-000000000001",
  identity: "a".repeat(64),
  provider: "Pilot",
  category: "stays",
  providerReference: "opaque-provider-token",
  signature: "b".repeat(64),
  criteria: defaultTravelCriteria(),
  title: "Synthetic hotel",
  price: 100,
  currency: "EUR",
  priceBasis: "unspecified",
  retrievedAt: new Date().toISOString(),
  reviewAfter: new Date().toISOString(),
  bookingUrl: "https://pilotplans.com/stays/synthetic",
  legs: [],
  baggage: null,
  address: null,
  reviewRating: null,
  reviewCount: null,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("explicit Travel to Onesa draft handoff", () => {
  it("prepares a reviewable message without provider tokens or credentials, then consumes it once", () => {
    const data = storage();
    expect(
      prepareTravelChatDraft(
        quote,
        "Explain this observation; do not invent prices."
      )
    ).toBe(true);
    const message = consumeTravelChatDraft()!;
    expect(message).toContain(
      "Explain this observation; do not invent prices."
    );
    expect(message).toContain("EUR 100");
    expect(message).not.toContain("opaque-provider-token");
    expect(message).not.toContain(quote.signature);
    expect(message).not.toContain(quote.bookingUrl);
    expect(data.size).toBe(0);
    expect(consumeTravelChatDraft()).toBeNull();
  });
  it("expires stale context and rejects malformed or oversized browser storage", () => {
    const data = storage();
    for (const value of [
      "invalid-json",
      JSON.stringify({ message: "stale", expiresAt: Date.now() - 1 }),
      JSON.stringify({
        message: "x".repeat(6001),
        expiresAt: Date.now() + 1000,
      }),
    ]) {
      data.set("du_travel_chat_draft_v1", value);
      expect(consumeTravelChatDraft()).toBeNull();
      expect(data.size).toBe(0);
    }
  });
  it("handles unavailable session storage and bounded message size without losing the trip", () => {
    storage();
    expect(prepareTravelChatDraft(quote, "x".repeat(6000))).toBe(false);
    vi.stubGlobal("window", {
      get sessionStorage() {
        throw new Error("Storage unavailable");
      },
    });
    expect(prepareTravelChatDraft(quote, "Explain")).toBe(false);
    expect(consumeTravelChatDraft()).toBeNull();
  });
});
