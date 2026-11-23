import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  nativeSavedSearch,
  prepareNativeSearch,
  type SavedTravel,
} from "../src/nativeTravelSearch";

const criteria: SavedTravel["draft"]["criteria"] = {
  origin: "FRA",
  destination: "HRE",
  departure: "2027-02-02",
  returnDate: "2027-02-05",
  adults: 1,
  rooms: 1,
  childAges: [],
  currency: "EUR",
  tripType: "return",
  pickup: "HRE",
  dropoff: "HRE",
  pickupTime: "10:00",
  dropoffTime: "10:00",
};
function savedSearch(): SavedTravel {
  return {
    id: "test",
    name: "Harare stay",
    kind: "search",
    draft: {
      criteria: { ...criteria, destination: "CPT" },
      searches: [{ category: "stays", criteria }],
    },
  };
}

beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2027-02-01T12:00:00Z")));
afterEach(() => vi.useRealTimers());

describe("native travel searches", () => {
  it("includes the traveller's nationality in the supplier request and the saved search snapshot", () => {
    const search = prepareNativeSearch("stays", criteria, " zw ");
    expect(search).toEqual({
      category: "stays",
      criteria: { ...criteria, guestNationality: "ZW" },
    });
    const saved = savedSearch();
    saved.draft.searches = [search];
    expect(nativeSavedSearch(saved)).toEqual(search);
  });
  it("restores legacy stays without assuming a nationality", () => {
    const restored = nativeSavedSearch(savedSearch());
    expect(restored).toEqual({ category: "stays", criteria });
    expect(() => prepareNativeSearch("stays", criteria, "")).toThrow(
      "nationality"
    );
    expect(() => prepareNativeSearch("stays", criteria, "D")).toThrow(
      "nationality"
    );
  });
  it.each(["QQ", "ZZ", "EU"])("explains the guest nationality field for %s", code => {
    expect(() => prepareNativeSearch("stays", criteria, code)).toThrow("ZW for Zimbabwe");
  });
  it("omits the hotel nationality when a traveller changes to flights", () => {
    expect(
      prepareNativeSearch(
        "flights",
        { ...criteria, guestNationality: "ZW" },
        "ZW"
      )
    ).toEqual({ category: "flights", criteria });
  });
  it("saves and restores a one-way flight without sending a hidden return date", () => {
    const search = prepareNativeSearch("flights", {
      ...criteria, tripType: "one-way", returnDate: "unfinished", guestNationality: "ZW",
    }, "ZW");
    expect(search.criteria).toEqual({ ...criteria, tripType: "one-way", returnDate: "" });
    const saved = savedSearch();
    saved.draft.searches = [search];
    expect(nativeSavedSearch(saved)).toEqual(search);
  });
  it("accepts same-day return flights and requires an overnight stay", () => {
    const sameDay = { ...criteria, returnDate: criteria.departure };
    expect(prepareNativeSearch("flights", sameDay, "").criteria).toEqual(sameDay);
    expect(() => prepareNativeSearch("stays", sameDay, "ZW")).toThrow("after check-in");
    expect(() => prepareNativeSearch("flights", { ...criteria, returnDate: "" }, "")).toThrow("valid return date");
    expect(() => prepareNativeSearch("flights", { ...criteria, returnDate: "2027-02-01" }, "")).toThrow("on or after");
  });
  it("catches invalid and past departure dates before a supplier request", () => {
    expect(() => prepareNativeSearch("flights", { ...criteria, departure: "2027-02-30" }, "")).toThrow("valid departure");
    expect(() => prepareNativeSearch("stays", { ...criteria, departure: "2027-01-31" }, "ZW")).toThrow("today or later");
  });
  it("opens complex itineraries and flexible-date searches on the website", () => {
    const stays = { category: "stays", criteria };
    const flight = { category: "flights", criteria };
    for (const saved of [
      { ...savedSearch(), kind: "trip" },
      { ...savedSearch(), draft: { criteria, searches: [] } },
      { ...savedSearch(), draft: { criteria, searches: [stays, flight] } },
      { ...savedSearch(), draft: { criteria, searches: [{ category: "car-hire", criteria }] } },
      { ...savedSearch(), draft: { criteria, searches: [{ ...flight, criteria: { ...criteria, flightFlexDays: 2 } }] } },
    ]) expect(nativeSavedSearch(saved)).toBeNull();
  });
  it.each(["EUR", "GBP", "USD", "ZAR"])("round-trips family rooms and ages in %s", currency => {
    const family = { ...criteria, adults: 2, childAges: [0, 3, 12, 17], rooms: 2, currency };
    const search = prepareNativeSearch("stays", family, "za");
    const saved = savedSearch();
    saved.draft.searches = [search];
    expect(nativeSavedSearch(saved)?.criteria).toEqual({ ...family, guestNationality: "ZA" });
    expect(prepareNativeSearch("flights", family, "").criteria).toEqual(family);
  });
  it.each([
    ["flights", { adults: 0 }, "1 and 9 adults"],
    ["flights", { adults: 10 }, "1 and 9 adults"],
    ["stays", { rooms: 10 }, "1 and 9 rooms"],
    ["stays", { rooms: 2 }, "one adult per room"],
    ["flights", { childAges: [0, 1] }, "aged 12 or older"],
    ["flights", { adults: 5, childAges: [0, 0, 0, 0, 1] }, "up to 4 infants"],
    ["flights", { adults: 9, childAges: [12] }, "up to 9 travellers"],
    ["flights", { childAges: [2, 3, 4, 5, 6, 7, 8] }, "up to 6 children"],
    ["stays", { childAges: [-1] }, "0 to 17"],
    ["stays", { childAges: [18] }, "0 to 17"],
    ["stays", { currency: "BAD" }, "EUR, GBP, USD or ZAR"],
  ] as const)("explains %s party limits for %o", (category, change, message) => {
    const party = { ...criteria, ...change, childAges: [...("childAges" in change ? change.childAges : [])] };
    expect(() => prepareNativeSearch(category, party, "ZA")).toThrow(message);
    const saved = savedSearch();
    saved.draft.searches = [{ category, criteria: party }];
    expect(nativeSavedSearch(saved)).toBeNull();
  });
});
