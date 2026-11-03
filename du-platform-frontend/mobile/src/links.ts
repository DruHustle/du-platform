// Reset email tokens may be in a fragment so they do not reach server logs.
// Convert only that fragment to an in-memory navigation parameter.
export function navigationPath(path: string): string {
  const [base, fragment] = path.split("#", 2);
  if (!fragment || !/^\/?reset-password(?:\?|$)/.test(base)) return path;
  const token = new URLSearchParams(fragment).get("token");
  if (!token) return base;
  const [pathname, query = ""] = base.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("token", token);
  return `${pathname}?${params}`;
}

// Keep a main screen below every cold-start detail/recovery link. Otherwise a
// reset email can open a stack containing only Reset, with no route back home.
export const nativeLinkingConfig = {
  initialRouteName: "Main",
  screens: {
    Main: { screens: { Home: "", Shop: "shop", Travel: "travel/:section?", Assistant: "onesa-ai-chat", Account: "login" } },
    Product: "shop/product/:slug",
    Reset: "reset-password",
    Cart: "basket",
    Search: "search",
    Contact: "contact",
  },
};

type NativeLink = { kind: "native"; path: string } | { kind: "website"; path: string; title: string } | { kind: "invalid" };

/** Resolve the web URLs claimed by native app links without dropping context. */
export function nativeLink(path: string): NativeLink {
  if (path.startsWith("//") || /[\\\u0000-\u001f]/.test(path)) return { kind: "invalid" };
  let url: URL;
  try { url = new URL(path.replace(/^\//, ""), "https://www.diasporaunlocked.com/"); }
  catch { return { kind: "invalid" }; }
  if (url.origin !== "https://www.diasporaunlocked.com" || url.username || url.password) return { kind: "invalid" };
  const pathname = url.pathname.replace(/\/$/, "");
  const website = (title: string): NativeLink => ({ kind: "website", path: `${url.pathname}${url.search}${url.hash}`, title });
  if (pathname === "/reset-password") return { kind: "native", path: navigationPath(`reset-password${url.search}${url.hash}`) };
  if ((pathname === "/register" || pathname === "/forgot-password") && !url.search && !url.hash)
    return { kind: "native", path: `login?mode=${pathname === "/register" ? "register" : "forgot"}` };
  if (pathname === "/shop" || pathname === "/shop/products") {
    const keys = [...url.searchParams.keys()];
    if (url.hash || keys.some(key => !["product", "category", "cart"].includes(key) || url.searchParams.getAll(key).length > 1)) return website("Shop");
    const slug = url.searchParams.get("product");
    const category = url.searchParams.get("category");
    const cart = url.searchParams.get("cart");
    if (cart !== null) return cart === "1" && !slug && (!category || category === "all") ? { kind: "native", path: "basket" } : website("Shop");
    // Web's product query matches product.slug, not a numeric database ID.
    if (slug) return /^[a-zA-Z0-9_-]{1,200}$/.test(slug) && (!category || category === "all")
      ? { kind: "native", path: `shop/product/${encodeURIComponent(slug)}` } : website("Shop");
    if (category && !["all", "sports", "crafts", "food", "beverage"].includes(category)) return website("Shop");
    return { kind: "native", path: `shop?category=${encodeURIComponent(category || "all")}` };
  }
  if (/^\/shop\/product\/[a-zA-Z0-9_-]{1,200}$/.test(pathname) && !url.search && !url.hash)
    return { kind: "native", path: pathname.slice(1) };
  if (/^\/travel(?:\/(?:flights|stays))?$/.test(pathname) && !url.search && !url.hash)
    return { kind: "native", path: pathname.slice(1) };
  if (pathname === "/login" && !url.hash && [...url.searchParams.keys()].every(key => key === "mode")
      && [null, "login", "register", "forgot"].includes(url.searchParams.get("mode")))
    return { kind: "native", path: `login${url.search}` };
  if (["", "/onesa-ai-chat", "/basket", "/search", "/contact"].includes(pathname) && !url.search && !url.hash)
    return { kind: "native", path: pathname.slice(1) };
  // Order-status grants, Travel drafts and unsupported detail pages must stay
  // intact. ExternalScreen uses an explicit browser view, not Linking.openURL,
  // so it cannot repeatedly send the same verified link back into this app.
  return website(pathname.startsWith("/travel") ? "Travel" : pathname.startsWith("/shop") ? "Shop" : "Diaspora Unlocked");
}

export function websiteLinkState(link: Extract<NativeLink, { kind: "website" }>) {
  return { index: 1, routes: [{ name: "Main" }, { name: "External", params: { path: link.path, title: link.title } }] };
}

export function accountNavigationState(mode: "login" | "register" | "forgot" = "login") {
  return { index: 0, routes: [{ name: "Main", state: { index: 0, routes: [{ name: "Account", params: { mode } }] } }] };
}

// Keep native research tabs and website-only Travel links faithful to their URLs.
export function travelLink(section?: string): { category?: "flights" | "stays"; website?: string } {
  if (!section) return {};
  if (section === "flights" || section === "stays") return { category: section };
  const webSections = ["car-hire", "explore", "my-trips", "planner", "virtual-experience", "augmented-experience", "weather"];
  return { website: webSections.includes(section) ? `/travel/${section}` : "/travel" };
}
