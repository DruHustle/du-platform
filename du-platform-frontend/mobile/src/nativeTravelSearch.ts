import type { TravelCriteria } from "./api";

export type TravelCategory = "flights" | "stays";
type NativeCriteria = TravelCriteria & {
  guestNationality?: string;
  flightFlexDays?: number;
};
type Search = { category: TravelCategory; criteria: NativeCriteria };
export type TravelParty = Pick<TravelCriteria, "adults" | "childAges" | "rooms" | "currency">;
export const travelCurrencies = ["EUR", "GBP", "USD", "ZAR"] as const;

export function partySummary(party: TravelParty, category: TravelCategory): string {
  const parts = [`${party.adults} adult${party.adults === 1 ? "" : "s"}`];
  if (party.childAges.length) {
    const ages = party.childAges.map(age => age < 0 ? "?" : String(age)).join(", ");
    parts.push(`${party.childAges.length} ${party.childAges.length === 1 ? "child" : "children"} (ages ${ages})`);
  }
  if (category === "stays") parts.push(`${party.rooms} room${party.rooms === 1 ? "" : "s"}`);
  return [...parts, party.currency].join(" · ");
}

function partyError(party: TravelParty, category: TravelCategory): string | undefined {
  const inRange = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!inRange(party.adults, 1, 9)) return "Choose between 1 and 9 adults.";
  if (!Array.isArray(party.childAges) || party.childAges.length > 6) return "Add up to 6 children.";
  if (party.childAges.some(age => !inRange(age, 0, 17))) return "Enter each child’s age from 0 to 17.";
  if (!inRange(party.rooms, 1, 9)) return "Choose between 1 and 9 rooms.";
  if (!travelCurrencies.some(currency => currency === party.currency)) return "Choose EUR, GBP, USD or ZAR.";
  if (category === "stays") {
    if (party.rooms > party.adults) return "Choose at least one adult per room.";
  } else {
    const olderTravellers = party.adults + party.childAges.filter(age => age >= 12).length;
    const infants = party.childAges.filter(age => age < 2).length;
    if (olderTravellers > 9) return "Flights allow up to 9 travellers aged 12 or older.";
    if (infants > 4) return "Flights allow up to 4 infants under age 2.";
    if (infants > olderTravellers) return "Each infant under age 2 needs a traveller aged 12 or older.";
  }
}

export type SavedTravel = {
  id: string;
  name: string;
  kind: string;
  draft: {
    criteria: NativeCriteria;
    searches?: { category: string; criteria: NativeCriteria }[];
  };
};

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function prepareNativeSearch(
  category: TravelCategory,
  criteria: NativeCriteria,
  nationality: string
): Search {
  const { guestNationality: _previousNationality, ...otherCriteria } = criteria;
  const invalidParty = partyError(criteria, category);
  if (invalidParty) throw new Error(invalidParty);
  const stay = category === "stays";
  if (!isCalendarDate(criteria.departure)) {
    throw new Error(`Enter a valid ${stay ? "check-in" : "departure"} date in YYYY-MM-DD format.`);
  }
  if (criteria.departure < new Date().toISOString().slice(0, 10)) {
    throw new Error(`Choose a ${stay ? "check-in" : "departure"} date of today or later.`);
  }
  if (!stay && criteria.tripType === "one-way") {
    return { category, criteria: { ...otherCriteria, returnDate: "" } };
  }
  if (!isCalendarDate(criteria.returnDate)) {
    throw new Error(`Enter a valid ${stay ? "check-out" : "return"} date in YYYY-MM-DD format.`);
  }
  if (stay && criteria.returnDate <= criteria.departure) {
    throw new Error("Choose a check-out date after check-in.");
  }
  if (criteria.returnDate < criteria.departure) {
    throw new Error("Choose a return date on or after departure.");
  }
  if (category === "flights") return { category, criteria: otherCriteria };
  const guestNationality = nationality.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(guestNationality) ||
      ["ZZ", "XX", "EU", "UN", "EZ", "QO", "XA", "XB"].includes(guestNationality) ||
      (typeof Intl.DisplayNames === "function" &&
        !new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(guestNationality))) {
    throw new Error("Enter a two-letter nationality code, such as ZW for Zimbabwe or ZA for South Africa.");
  }
  return { category, criteria: { ...otherCriteria, guestNationality } };
}

// Detailed itineraries and flexible-date searches are available on the website.
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
    !(c.tripType === "return" || (selected.category === "flights" && c.tripType === "one-way")) ||
    partyError(c, selected.category) ||
    (c.flightFlexDays ?? 0) !== 0 ||
    (c.guestNationality !== undefined &&
      (typeof c.guestNationality !== "string" ||
        !/^(?:[A-Z]{2})?$/.test(c.guestNationality)))
  )
    return null;
  return { category: selected.category, criteria: c };
}
