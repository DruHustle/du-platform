import { getCookieConsent } from "@/lib/cookieConsent";
import { api } from "@/lib/api";
// Fixed event names only. No product names, queries, identifiers, URLs or PII.
export function trackShopFunnel(event: "product_discovery" | "basket_add") {
  if (getCookieConsent() !== "accepted") return;
  void api.post("/shop/funnel", { event, consent: true }).catch(() => {});
}
