import { api } from "@/lib/api";
import {
  savedTravelSchema,
  travelResultsSchema,
  travelQuoteSchema,
  type SavedTravel,
  type TravelCriteria,
  type TravelQuote,
} from "@/contracts/travel";
import { z } from "@/contracts/validation";

const savedTravelListSchema = z
  .array(
    savedTravelSchema.safeExtend({
      id: z.string().uuid(),
      updatedAt: z.string().datetime(),
    })
  )
  .max(30)
  .refine(rows => new Set(rows.map(row => row.id)).size === rows.length);

export async function loadSavedTravel(): Promise<SavedTravel[]> {
  // The shared API interceptor already unwraps {success,data,error}.
  const response = await api.get<SavedTravel[]>("/travel/saved");
  // Validate the entire payload before rendering or restoring it into the guest
  // draft. A malformed successful response must use the recoverable error state.
  const parsed = savedTravelListSchema.safeParse(response.data);
  if (!parsed.success) throw new Error("TRAVEL_INVALID_RESPONSE");
  return parsed.data;
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
  const response = await api.post("/travel/revalidate", quote, {
    signal,
    timeout: 30000,
  });
  return z
    .object({ quote: travelQuoteSchema, changed: z.boolean() })
    .strict()
    .parse(response.data);
}
