import { useSyncExternalStore } from "react";
import { safeLocalStorage } from "@/lib/browserStorage";
import { getCookieConsent } from "@/lib/cookieConsent";
import { track } from "@vercel/analytics";
import {
  defaultTravelCriteria,
  guestTravelDraftSchema,
  type TravelDraft,
} from "@shared/travel";
const key = "du_travel_draft_v1";
let draft: TravelDraft | undefined;
const listeners = new Set<() => void>();
function read() {
  if (!draft) {
    try {
      draft = guestTravelDraftSchema.parse(
        JSON.parse(safeLocalStorage.getItem(key) || "null")
      );
    } catch {
      draft = {
        criteria: defaultTravelCriteria(),
        searches: [],
        estimates: [],
      };
    }
  }
  return draft;
}
export function updateDraft(
  next: TravelDraft | ((previous: TravelDraft) => TravelDraft)
) {
  draft = typeof next === "function" ? next(read()) : next;
  safeLocalStorage.setItem(key, JSON.stringify(draft));
  listeners.forEach(l => l());
}
export function useTravelDraft() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    read,
    read
  );
}
// Only fixed event/category enums, never destinations, dates, IDs or raw criteria.
export function travelEvent(
  event:
    | "criteria_reviewed"
    | "resource_opened"
    | "trip_saved"
    | "trip_returned",
  category?: string
) {
  if (
    getCookieConsent() === "accepted" &&
    import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS === "true"
  )
    track(`travel_${event}`, category ? { category } : undefined);
}
