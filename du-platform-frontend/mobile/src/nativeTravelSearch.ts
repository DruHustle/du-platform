import type { TravelCriteria } from "./api";

export type TravelCategory = "flights" | "stays";
type NativeCriteria = TravelCriteria & {
  guestNationality?: string;
  flightFlexDays?: number;
};
type Search = { category: TravelCategory; criteria: NativeCriteria };

export type SavedTravel = {
  id: string;
  name: string;
  kind: string;
  draft: {
    criteria: NativeCriteria;
    searches?: { category: string; criteria: NativeCriteria }[];
  };
};

export function prepareNativeSearch(
  category: TravelCategory,
  criteria: NativeCriteria,
  nationality: string
): Search {
  const { guestNationality: _previousNationality, ...otherCriteria } = criteria;
  if (category === "flights") return { category, criteria: otherCriteria };
  const guestNationality = nationality.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(guestNationality)) {
    throw new Error("Enter your two-letter nationality code for this stay.");
  }
  return { category, criteria: { ...otherCriteria, guestNationality } };
}

// The current form supports one adult in EUR. Keep other saved itineraries intact on the website.
export function nativeSavedSearch(saved: SavedTravel): Search | null {
  const searches = saved.draft.searches;
  if (
    saved.kind !== "search" ||
    !Array.isArray(searches) ||
    searches.length !== 1
  )
    return null;
  const selected = searches[0];
  if (selected?.category !== "flights" && selected?.category !== "stays")
    return null;
  const c = selected.criteria;
  if (
    !c ||
    typeof c.origin !== "string" ||
    typeof c.destination !== "string" ||
    typeof c.departure !== "string" ||
    typeof c.returnDate !== "string" ||
    c.tripType !== "return" ||
    c.adults !== 1 ||
    c.rooms !== 1 ||
    c.currency !== "EUR" ||
    !Array.isArray(c.childAges) ||
    c.childAges.length ||
    (c.flightFlexDays ?? 0) !== 0 ||
    (c.guestNationality !== undefined &&
      (typeof c.guestNationality !== "string" ||
        !/^(?:[A-Z]{2})?$/.test(c.guestNationality)))
  )
    return null;
  return { category: selected.category, criteria: c };
}
