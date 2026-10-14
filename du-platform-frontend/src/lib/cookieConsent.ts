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
  return getCookieConsent() === "accepted" ? event : null;
}
