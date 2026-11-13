import { describe, expect, it } from "vitest";
import type { TravelQuote } from "../src/api";
import { currentQuote, flightLegSummary, validAwinReferral } from "../src/travelHandoff";

const quote: TravelQuote = { provider:"Kiwi.com", category:"flights", title:"LHR → HRE", identity:"fixture-identity", price:400, currency:"GBP", bookingUrl: "https://kiwi.com/u/selected", id: "fixture", reviewAfter: "2027-01-15T11:25:00Z" };
describe("native flight checkout handoff", () => {
  it("preserves airport local times when a flight crosses midnight", () => {
    expect(flightLegSummary({ route: ["LHR", "ADD", "HRE"], departureTime: "2027-01-15T22:00:00+00:00",
      arrivalTime: "2027-01-16T14:30:00+02:00", airlines: ["Fixture Air"] }))
      .toBe("LHR → ADD → HRE · 2027-01-15 22:00 → 2027-01-16 14:30 · Fixture Air");
  });
  it("requires a fresh recheck even when the app is returning from the background", () => {
    expect(currentQuote(quote, Date.parse("2027-01-15T11:24:59Z"))).toBe(true);
    expect(currentQuote(quote, Date.parse("2027-01-15T11:25:00Z"))).toBe(false);
    expect(currentQuote({...quote, reviewAfter: null})).toBe(false);
  });
  it("only accepts the network link for this exact quote", () => {
    const link = new URL("https://www.awin1.com/cread.php");
    link.search = new URLSearchParams({cons:"1", clickref: quote.id, ued:quote.bookingUrl}).toString();
    expect(validAwinReferral(link.href, quote)).toBe(true);
    link.searchParams.set("ued", "https://kiwi.com/");
    expect(validAwinReferral(link.href, quote)).toBe(false);
    expect(validAwinReferral("garbage", quote)).toBe(false);
  });
});
