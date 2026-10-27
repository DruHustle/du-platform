import { z } from "./validation";

// Curated airport identifiers, not provider-specific hotel/city IDs. Adding a
// country requires no schema change. These entries do not establish availability.
export const travelLocations = [
  ["HRE", "Harare", "ZW"],
  ["VFA", "Victoria Falls", "ZW"],
  ["BUQ", "Bulawayo", "ZW"],
  ["JNB", "Johannesburg", "ZA"],
  ["CPT", "Cape Town", "ZA"],
  ["DUR", "Durban", "ZA"],
  ["GBE", "Gaborone", "BW"],
  ["MUB", "Maun", "BW"],
  ["WDH", "Windhoek", "NA"],
  ["LUN", "Lusaka", "ZM"],
  ["LVI", "Livingstone", "ZM"],
  ["MPM", "Maputo", "MZ"],
  ["VNX", "Vilankulo", "MZ"],
  ["LLW", "Lilongwe", "MW"],
  ["BLZ", "Blantyre", "MW"],
  ["MSU", "Maseru", "LS"],
  ["SHO", "Manzini", "SZ"],
  ["LAD", "Luanda", "AO"],
  ["FRA", "Frankfurt", "DE"],
  ["LHR", "London Heathrow", "GB"],
  ["DXB", "Dubai", "AE"],
  ["MRU", "Mauritius", "MU"],
  ["TNR", "Antananarivo", "MG"],
  ["SEZ", "Mahé", "SC"],
].map(([id, name, country]) => ({ id, name, country }));
export const mainlandCountries = [
  "ZW",
  "ZA",
  "BW",
  "NA",
  "ZM",
  "MZ",
  "MW",
  "LS",
  "SZ",
  "AO",
];
export const currencies = ["EUR", "GBP", "USD", "ZAR"] as const;
export const categories = ["flights", "stays", "car-hire"] as const;
export type TravelCategory = (typeof categories)[number];
const location = z
  .string()
  .refine(v => v === "" || travelLocations.some(l => l.id === v), "location");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(v => {
    const d = new Date(v + "T12:00:00Z");
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === v;
  }, "date");
export const travelCriteriaSchema = z
  .object({
    origin: location,
    destination: location,
    tripType: z.enum(["return", "one-way"]),
    departure: date,
    returnDate: date.or(z.literal("")),
    adults: z.number().int().min(1).max(9),
    childAges: z.array(z.number().int().min(0).max(17)).max(6),
    rooms: z.number().int().min(1).max(9),
    currency: z.enum(currencies),
    pickup: location,
    dropoff: location,
    pickupTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    dropoffTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
export type TravelCriteria = z.infer<typeof travelCriteriaSchema>;
export function validateTravel(
  criteria: unknown,
  category: TravelCategory,
  today = new Date().toISOString().slice(0, 10)
) {
  const parsed = travelCriteriaSchema.safeParse(criteria);
  if (!parsed.success) return { success: false as const, error: "criteria" };
  const c = parsed.data;
  const known = (id: string) => travelLocations.some(l => l.id === id);
  if (
    (category === "flights" && (!known(c.origin) || !known(c.destination))) ||
    (category === "stays" && !known(c.destination)) ||
    (category === "car-hire" && (!known(c.pickup) || !known(c.dropoff)))
  )
    return { success: false as const, error: "criteria" };
  if (c.departure < today) return { success: false as const, error: "past" };
  if (
    (category !== "flights" || c.tripType === "return") &&
    (!c.returnDate ||
      c.returnDate < c.departure ||
      (category === "stays" && c.returnDate === c.departure))
  )
    return { success: false as const, error: "dates" };
  if (
    category === "car-hire" &&
    c.returnDate === c.departure &&
    c.dropoffTime <= c.pickupTime
  )
    return { success: false as const, error: "time" };
  if (category === "flights" && c.origin === c.destination)
    return { success: false as const, error: "route" };
  // One adult per room; exact room allocation must be supplied to a live adapter.
  if (category === "stays" && c.rooms > c.adults)
    return { success: false as const, error: "occupancy" };
  return { success: true as const, data: c };
}
export function defaultTravelCriteria(): TravelCriteria {
  const day = (n: number) =>
    new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  return {
    origin: "FRA",
    destination: "HRE",
    tripType: "return",
    departure: day(30),
    returnDate: day(37),
    adults: 1,
    childAges: [],
    rooms: 1,
    currency: "EUR",
    pickup: "HRE",
    dropoff: "HRE",
    pickupTime: "10:00",
    dropoffTime: "10:00",
  };
}
export const travelCapabilities = {
  provider: "KAYAK",
  mode: "unavailable",
  liveResults: false,
  criteriaLinks: false,
  embedded: false,
  monitoring: false,
  flexibleDates: false,
  nearbyAirports: false,
} as const;
// Fixed ordinary consumer links only. No invented affiliate ID, redirect URL,
// provider location IDs or undocumented criteria parameters.
export const providerResources: Record<TravelCategory, string> = {
  flights: "https://www.kayak.com/flights",
  stays: "https://www.kayak.com/hotels",
  "car-hire": "https://www.kayak.com/cars",
};
export function isSafeTravelLink(raw: string) {
  return Object.values(providerResources).includes(raw);
}
export const travelSearchSchema = z
  .object({ category: z.enum(categories), criteria: travelCriteriaSchema })
  .strict();
export const estimateSchema = z
  .object({
    id: z.string().uuid(),
    category: z.enum(categories),
    amount: z.number().finite().nonnegative().max(10000000),
    currency: z.enum(currencies),
  })
  .strict();
export const travelDraftSchema = z
  .object({
    criteria: travelCriteriaSchema,
    searches: z
      .array(travelSearchSchema)
      .max(3)
      .refine(
        items => new Set(items.map(i => i.category)).size === items.length,
        "duplicate category"
      )
      .refine(
        items =>
          items.every(
            i => validateTravel(i.criteria, i.category, "0000-01-01").success
          ),
        "invalid search"
      ),
    estimates: z
      .array(estimateSchema)
      .max(20)
      .refine(
        items => new Set(items.map(i => i.id)).size === items.length,
        "duplicate estimate"
      ),
  })
  .strict();
export type TravelDraft = z.infer<typeof travelDraftSchema>;
// Keep bounded, unfinished fields across refreshes without accepting them as
// valid searches or server saves. Validation happens explicitly on submission.
export const guestTravelDraftSchema = travelDraftSchema.extend({
  criteria: travelCriteriaSchema.extend({
    origin: z.string().max(8),
    destination: z.string().max(8),
    pickup: z.string().max(8),
    dropoff: z.string().max(8),
    departure: z.string().max(10),
    returnDate: z.string().max(10),
    pickupTime: z.string().max(5),
    dropoffTime: z.string().max(5),
    adults: z.number().int().min(0).max(9),
    rooms: z.number().int().min(0).max(9),
    childAges: z.array(z.number().int().min(-1).max(17)).max(6),
  }),
});
export const savedTravelSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    kind: z.enum(["trip", "search"]),
    draft: travelDraftSchema,
  })
  .strict()
  .refine(
    value => value.kind !== "search" || value.draft.searches.length > 0,
    "empty saved search"
  );
export type SavedTravelInput = z.infer<typeof savedTravelSchema>;
export type SavedTravel = SavedTravelInput & { id: string; updatedAt: string };
// Totals never combine currencies or deposits. Unquoted items remain unquoted.
export function estimateTotals(estimates: TravelDraft["estimates"]) {
  return estimates.reduce<Partial<Record<(typeof currencies)[number], number>>>(
    (totals, item) => {
      totals[item.currency] =
        Math.round(((totals[item.currency] ?? 0) + item.amount) * 100) / 100;
      return totals;
    },
    {}
  );
}
