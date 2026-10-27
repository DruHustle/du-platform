import { api } from "@/lib/api";
import type { SavedTravel } from "@shared/travel";
export async function loadSavedTravel(): Promise<SavedTravel[]> {
  // The shared API interceptor already unwraps {success,data,error}.
  const response = await api.get<SavedTravel[]>("/travel/saved");
  if (!Array.isArray(response.data)) throw new Error("TRAVEL_INVALID_RESPONSE");
  return response.data;
}
