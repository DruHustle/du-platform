import { readOrderReceipt } from "@/modules/shop/lib/checkoutSession";
import { getOrderAccessGrant } from "@/modules/shop/lib/orderAccess";
import { useSyncExternalStore } from "react";

export type CookieConsent = "accepted" | "rejected" | null;
const CONSENT_KEY = "du_cookie_consent_v1";
const CHANGE_EVENT = "du-cookie-consent-change";
let memoryConsent: CookieConsent = null;

export function getCookieConsent(): CookieConsent {
  try {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === "accepted" || stored === "rejected"
      ? stored
      : memoryConsent;
  } catch {
    return memoryConsent;
  }
}

export function setCookieConsent(consent: Exclude<CookieConsent, null>) {
  memoryConsent = consent;
  try {
    window.localStorage.setItem(CONSENT_KEY, consent);
  } catch {
    // Keep the preference for this visit when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  if (consent === "rejected") {
    const receipt = readOrderReceipt();
    const grant = getOrderAccessGrant();
    const ref = grant?.orderRef ?? receipt?.orderRef,
      token = grant?.token ?? receipt?.manageToken;
    if (ref && token)
      void fetch(
        `/api/shop/orders/${encodeURIComponent(ref)}/analytics-consent`,
        {
          method: "POST",
          credentials: "omit",
          headers: {
            "Content-Type": "application/json",
            "X-Order-Access-Token": token,
          },
          body: JSON.stringify({ consent: false }),
        }
      ).catch(() => {});
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCookieConsent() {
  return useSyncExternalStore(subscribe, getCookieConsent, () => null);
}

// SDK scripts may remain installed after their React components unmount.
// Check the current preference for every event so revocation also stops them.
export function filterOptionalTelemetry<T>(event: T): T | null {
  if (getCookieConsent() !== "accepted") return null;
  if (
    event &&
    typeof event === "object" &&
    "url" in event &&
    typeof event.url === "string"
  ) {
    // Searches and private status fragments must never enter optional SDK data.
    return { ...event, url: event.url.split(/[?#]/, 1)[0] } as T;
  }
  return event;
}
