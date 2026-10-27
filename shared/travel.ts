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
    guestNationality: z
      .string()
      .regex(/^(?:[A-Z]{2})?$/)
      .optional(),
    flightFlexDays: z.number().int().min(0).max(3).optional(),
  })
  .strict();
export type TravelCriteria = z.infer<typeof travelCriteriaSchema>;
export function isTravelNationality(value: string) {
  return (
    /^[A-Z]{2}$/.test(value) &&
    !["ZZ", "XX", "EU", "UN", "EZ", "QO", "XA", "XB"].includes(value) &&
    Boolean(
      new Intl.DisplayNames(["en"], { type: "region", fallback: "none" }).of(
        value
      )
    )
  );
}
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
  if (category === "flights") {
    const adults = c.adults + c.childAges.filter(age => age >= 12).length;
    const infants = c.childAges.filter(age => age < 2).length;
    if (adults > 9 || infants > 4 || infants > adults)
      return { success: false as const, error: "criteria" };
  }
  // One adult per room; exact room allocation must be supplied to a live adapter.
  if (category === "stays" && c.rooms > c.adults)
    return { success: false as const, error: "occupancy" };
  if (
    category === "stays" &&
    c.guestNationality &&
    !isTravelNationality(c.guestNationality)
  )
    return { success: false as const, error: "criteria" };
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
  provider: "Kiwi.com / Pilot",
  mode: "public-search",
  liveResults: true,
  criteriaLinks: false,
  embedded: false,
  monitoring: false,
  flexibleDates: true,
  nearbyAirports: false,
  categories: {
    flights: { provider: "Kiwi.com", mode: "public-api", flexibleDates: true },
    stays: { provider: "Pilot", mode: "public-api" },
    "car-hire": { provider: null, mode: "unavailable" },
  },
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

export function isSafeSupplierLink(provider: string, raw: string) {
  try {
    const url = new URL(raw);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    )
      return false;
    if (provider === "Kiwi.com")
      return (
        ["kiwi.com", "www.kiwi.com"].includes(url.hostname) &&
        /^\/u\/[a-zA-Z0-9_-]{1,100}$/.test(url.pathname) &&
        !url.search
      );
    if (provider === "Pilot")
      return (
        ["pilotplans.com", "www.pilotplans.com"].includes(url.hostname) &&
        /^\/stays\/[a-zA-Z0-9_-]{1,200}$/.test(url.pathname) &&
        Array.from(url.searchParams).every(
          ([key, value]) =>
            ["checkInDate", "checkOutDate", "rooms", "currency"].includes(
              key
            ) && /^[a-zA-Z0-9,_.-]{1,150}$/.test(value)
        )
      );
    return false;
  } catch {
    return false;
  }
}
const localTimestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?$/)
  .refine(value => {
    const local = new Date(value.slice(0, 19) + "Z");
    return (
      Number.isFinite(+local) &&
      local.toISOString().slice(0, 19) === value.slice(0, 19)
    );
  });
export const travelLegSchema = z
  .object({
    route: z
      .array(z.string().regex(/^[A-Z]{3}$/))
      .min(2)
      .max(12),
    departureTime: localTimestamp,
    arrivalTime: localTimestamp,
    durationSeconds: z.number().int().nonnegative().max(604800),
    stops: z.number().int().nonnegative().max(10),
    cabin: z.string().max(100).nullable(),
    airlines: z.array(z.string().max(100)).max(12),
  })
  .strict();
export const travelQuoteSchema = z
  .object({
    id: z.string().uuid(),
    identity: z.string().regex(/^[a-f0-9]{64}$/),
    provider: z.enum(["Kiwi.com", "Pilot"]),
    category: z.enum(["flights", "stays"]),
    providerReference: z.string().min(1).max(12000),
    criteria: travelCriteriaSchema,
    title: z.string().min(1).max(250),
    price: z.number().finite().nonnegative().max(10000000),
    currency: z.enum(currencies),
    priceBasis: z.enum(["party-total", "unspecified"]),
    retrievedAt: z.string().datetime(),
    // DU's review window, not a supplier guarantee or supplier expiry time.
    reviewAfter: z.string().datetime(),
    bookingUrl: z.string().max(4096),
    legs: z.array(travelLegSchema).max(2),
    baggage: z
      .object({
        personalItem: z.number().int().nonnegative().max(100).nullable(),
        cabinBag: z.number().int().nonnegative().max(100).nullable(),
        checkedBag: z.number().int().nonnegative().max(100).nullable(),
      })
      .strict()
      .nullable(),
    address: z.string().max(500).nullable(),
    reviewRating: z.number().min(0).max(10).nullable(),
    reviewCount: z.number().int().nonnegative().max(10000000).nullable(),
    signature: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
  .superRefine((q, ctx) => {
    if (
      !isSafeSupplierLink(q.provider, q.bookingUrl) ||
      (q.provider === "Kiwi.com" &&
        (q.category !== "flights" ||
          q.legs.length < 1 ||
          q.priceBasis !== "party-total")) ||
      (q.provider === "Pilot" &&
        (q.category !== "stays" ||
          q.legs.length !== 0 ||
          q.priceBasis !== "unspecified"))
    )
      ctx.addIssue({ code: "custom", message: "Invalid supplier quote" });
  });
export type TravelQuote = z.infer<typeof travelQuoteSchema>;
export const travelResultsSchema = z
  .object({
    provider: z.enum(["Kiwi.com", "Pilot"]),
    category: z.enum(["flights", "stays"]),
    retrievedAt: z.string().datetime(),
    quotes: z.array(travelQuoteSchema).max(20),
    rejectedCount: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    result =>
      result.quotes.every(
        quote =>
          quote.provider === result.provider &&
          quote.category === result.category
      ) &&
      new Set(result.quotes.map(quote => quote.id)).size ===
        result.quotes.length &&
      new Set(result.quotes.map(quote => quote.identity)).size ===
        result.quotes.length,
    "Invalid supplier result collection"
  );
export type TravelResults = z.infer<typeof travelResultsSchema>;
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
    quotes: z
      .array(travelQuoteSchema)
      .max(6)
      .refine(
        items =>
          new Set(items.map(item => item.id)).size === items.length &&
          new Set(items.map(item => item.identity)).size === items.length,
        "duplicate supplier option"
      )
      .optional(),
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
