import { travelCanonicalPaths, travelRedirects } from "./travelRoutes";
export function allowedOnesaHref(raw: string): string | null {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.length > 1000)
    return null;
  try {
    const url = new URL(raw, "https://www.diasporaunlocked.com");
    if (url.origin !== "https://www.diasporaunlocked.com") return null;
    url.pathname = travelRedirects[url.pathname] ?? url.pathname;
    const paths = [
      "/shop",
      "/shop/products", "/travel", "/travel/weather", "/travel/planner",
      "/travel/augmented-experience", "/travel/virtual-experience",
      "/investment", "/investment/opportunities", "/ntir", "/technology",
      ...travelCanonicalPaths,
    ];
    // Travel criteria belong in the explicit draft, never an AI-generated URL.
    if (travelCanonicalPaths.includes(url.pathname) && url.search) return null;
    if (
      !paths.includes(url.pathname) &&
      !/^\/shop\/product\/[a-z0-9_-]+$/.test(url.pathname)
    )
      return null;
    if (
      Array.from(url.searchParams.keys()).some(
        key =>
          !["product", "category", "segment", "available", "q"].includes(key)
      )
    )
      return null;
    if (url.hash && !/^#[a-z0-9-]+$/.test(url.hash)) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
