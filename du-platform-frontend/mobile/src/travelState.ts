import type { TravelCriteria } from "./api";

export type NativeTravelCategory = "flights" | "stays";
export type NativeSearch = { category: NativeTravelCategory; criteria: TravelCriteria };
export type SavedTravel = {
  id: string;
  name: string;
  kind: string;
  draft: { criteria: TravelCriteria; searches?: { category: string; criteria: TravelCriteria }[] };
};

export function defaultNativeSearch(): NativeSearch {
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
  return {
    category: "flights",
    criteria: {
      origin: "FRA", destination: "HRE", tripType: "return", departure: day(30), returnDate: day(37),
      adults: 1, childAges: [], rooms: 1, currency: "EUR", pickup: "HRE", dropoff: "HRE", pickupTime: "10:00", dropoffTime: "10:00",
    },
  };
}

const fields = new Set(["origin", "destination", "tripType", "departure", "returnDate", "adults", "childAges", "rooms", "currency", "pickup", "dropoff", "pickupTime", "dropoffTime", "guestNationality", "flightFlexDays"]);
function isNativeCriteria(value: unknown): value is TravelCriteria {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as Record<string, unknown>;
  return Object.keys(c).every(key => fields.has(key))
    && ["origin", "destination", "departure", "returnDate", "pickup", "dropoff", "pickupTime", "dropoffTime"].every(key => typeof c[key] === "string")
    && c.tripType === "return" && c.adults === 1 && Array.isArray(c.childAges) && c.childAges.length === 0
    && c.rooms === 1 && c.currency === "EUR" && (c.guestNationality === undefined || c.guestNationality === "")
    && (c.flightFlexDays === undefined || c.flightFlexDays === 0);
}

export function isSavedTravel(value: unknown): value is SavedTravel {
  if (!value || typeof value !== "object") return false;
  const row = value as SavedTravel;
  return typeof row.id === "string" && typeof row.name === "string" && typeof row.kind === "string"
    && [row.draft?.criteria?.origin, row.draft?.criteria?.destination, row.draft?.criteria?.departure, row.draft?.criteria?.returnDate].every(part => typeof part === "string");
}

/** A saved search's own criteria are authoritative, not the draft's last edited form. */
export function savedSearchDestination(saved: SavedTravel):
  | { kind: "native"; search: NativeSearch }
  | { kind: "website"; path: "/travel/my-trips"; reason: string } {
  const searches = saved.draft.searches;
  if (saved.kind === "search" && Array.isArray(searches) && searches.length === 1) {
    const selected = searches[0];
    if ((selected?.category === "flights" || selected?.category === "stays") && isNativeCriteria(selected.criteria))
      return { kind: "native", search: { category: selected.category, criteria: { ...selected.criteria, childAges: [...selected.criteria.childAges] } } };
  }
  return {
    kind: "website", path: "/travel/my-trips",
    reason: "This saved trip uses options available on the website. Open it there to keep all travellers, search types and preferences.",
  };
}

export function normalizedNativeSearch(search: NativeSearch): NativeSearch {
  return { category: search.category, criteria: {
    ...search.criteria,
    origin: search.criteria.origin.trim().toUpperCase(), destination: search.criteria.destination.trim().toUpperCase(),
    departure: search.criteria.departure.trim(), returnDate: search.criteria.returnDate.trim(),
    childAges: [...search.criteria.childAges],
  } };
}

