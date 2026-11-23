import { api } from "@/lib/api";
import {
  savedTravelSchema,
  travelResultsSchema,
  travelQuoteSchema,
  type SavedTravel,
  type SavedTravelInput,
  type TravelCriteria,
  type TravelQuote,
} from "@/domain/travel";
import { z } from "@/domain/validation";

const savedTravelListSchema = z
  .array(
    savedTravelSchema.safeExtend({
      id: z.string().uuid(),
      updatedAt: z.string().datetime(),
    })
  )
  .max(30)
  .refine(rows => new Set(rows.map(row => row.id)).size === rows.length);

const safeResource = z.string().url().refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === "www.kayak.com" && !url.username && !url.password && !url.port && !url.search && !url.hash && /^\/(?:flights|hotels|cars)$/.test(url.pathname);
});
const travelReferenceSchema = z.object({
  locations: z.array(z.object({ id: z.string().regex(/^[A-Z]{3}$/), name: z.string().min(1), country: z.string().regex(/^[A-Z]{2}$/) })).min(1).max(500),
  resources: z.object({ flights: safeResource, stays: safeResource, "car-hire": safeResource }),
});
export type TravelReference = z.infer<typeof travelReferenceSchema>;
export async function loadTravelReference(signal?: AbortSignal): Promise<TravelReference> {
  const response = await api.get("/travel/capabilities", { signal });
  return travelReferenceSchema.parse(response.data);
}

export async function loadSavedTravel(): Promise<SavedTravel[]> {
  // The shared API interceptor already unwraps {success,data,error}.
  const response = await api.get<SavedTravel[]>("/travel/saved");
  // Validate the entire payload before rendering or restoring it into the guest
  // draft. A malformed successful response must use the recoverable error state.
  const parsed = savedTravelListSchema.safeParse(response.data);
  if (!parsed.success) throw new Error("TRAVEL_INVALID_RESPONSE");
  return parsed.data;
}
export async function saveTravel(input: SavedTravelInput) {
  const response = await api.post("/travel/saved", input);
  z.object({ id: z.string().uuid() }).parse(response.data);
}

export async function deleteSavedTravel(id: string) {
  const response = await api.delete(`/travel/saved/${id}`);
  z.object({ removed: z.literal(true) }).parse(response.data);
}

export async function searchTravel(
  category: "flights" | "stays",
  criteria: TravelCriteria,
  signal: AbortSignal
) {
  const response = await api.post(
    "/travel/search",
    { category, criteria },
    { signal, timeout: 30000 }
  );
  const parsed = travelResultsSchema.parse(response.data);
  if (parsed.category !== category) throw new Error("TRAVEL_INVALID_RESPONSE");
  return parsed;
}
export async function revalidateTravelQuote(
  quote: TravelQuote,
  signal: AbortSignal
) {
  const response = await api.post("/travel/revalidate?channel=web", quote, {
    signal,
    timeout: 30000,
  });
  return z
    .object({ quote: travelQuoteSchema, changed: z.boolean(), referralAvailable: z.boolean().optional() })
    .strict()
    .parse(response.data);
}

export async function requestAwinReferral(quote: TravelQuote, signal: AbortSignal) {
  const response = await api.post("/travel/referrals/awin", { quote, channel: "web", consent: true }, { signal });
  const result = z.object({ url: z.string().url() }).parse(response.data);
  const url = new URL(result.url);
  if (url.origin !== "https://www.awin1.com" || url.pathname !== "/cread.php" || url.username || url.password ||
      url.searchParams.get("ued") !== quote.bookingUrl || url.searchParams.get("clickref") !== quote.id ||
      url.searchParams.get("cons") !== "1") throw new Error("TRAVEL_INVALID_RESPONSE");
  return url.href;
}
