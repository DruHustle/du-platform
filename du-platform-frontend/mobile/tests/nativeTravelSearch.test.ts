import { describe, expect, it } from "vitest";
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

describe("native stay searches", () => {
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
  it("omits the hotel nationality when a traveller changes to flights", () => {
    expect(
      prepareNativeSearch(
        "flights",
        { ...criteria, guestNationality: "ZW" },
        "ZW"
      )
    ).toEqual({ category: "flights", criteria });
  });
  it("preserves complete trips and multi-passenger searches for the website", () => {
    for (const saved of [
      { ...savedSearch(), kind: "trip" },
      { ...savedSearch(), draft: { criteria, searches: [] } },
      {
        ...savedSearch(),
        draft: {
          criteria,
          searches: [
            { category: "stays", criteria: { ...criteria, adults: 2 } },
          ],
        },
      },
    ])
      expect(nativeSavedSearch(saved)).toBeNull();
  });
});
