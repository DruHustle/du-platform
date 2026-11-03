import { safeSessionStorage } from "@/lib/browserStorage";
const key = "du_order_status_grant_v1";
let grant: { orderRef: string; token: string } | null = null;
function valid(value: any): value is { orderRef: string; token: string } {
  return (
    /^DU-[A-Z0-9-]+$/.test(value?.orderRef || "") &&
    /^[a-f0-9]{64}$/.test(value?.token || "")
  );
}
// Run before rendering or optional telemetry. Fragments never reach HTTP logs;
// strip them immediately and retain only a tab-scoped bearer, never contact data.
export function consumeOrderAccessFragment() {
  if (window.location.pathname !== "/shop/order-status") return;
  if (window.location.hash) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const candidate = {
      orderRef: params.get("ref"),
      token: params.get("access"),
    };
    grant = valid(candidate) ? candidate : null;
    if (grant) safeSessionStorage.setItem(key, JSON.stringify(grant));
    else safeSessionStorage.removeItem(key);
    window.history.replaceState(null, "", window.location.pathname);
  } else {
    try {
      const stored = JSON.parse(safeSessionStorage.getItem(key) || "null");
      grant = valid(stored) ? stored : null;
    } catch {
      grant = null;
    }
  }
}
export function getOrderAccessGrant() {
  return grant;
}
