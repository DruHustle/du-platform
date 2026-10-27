import { api } from "@/lib/api";
import { savedTravelSchema, type SavedTravel } from "@shared/travel";
import { z } from "@shared/validation";

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
