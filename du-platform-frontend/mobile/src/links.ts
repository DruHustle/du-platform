// Reset email tokens may be in a fragment so they do not reach server logs.
// Convert only that fragment to an in-memory navigation parameter.
export function navigationPath(path: string): string {
  const [base, fragment] = path.split("#", 2);
  if (/^\/?(?:onesa|technology)\/?(?:\?|$)/.test(base)) return "onesa-ai-chat";
  if (!fragment || !/^\/?reset-password(?:\?|$)/.test(base)) return path;
  const token = new URLSearchParams(fragment).get("token");
  if (!token) return base;
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}token=${encodeURIComponent(token)}`;
}

// Keep native research tabs and website-only Travel links faithful to their URLs.
export function travelLink(section?: string): { category?: "flights" | "stays"; website?: string } {
  if (!section) return {};
  if (section === "flights" || section === "stays") return { category: section };
  const webSections = ["car-hire", "explore", "my-trips", "planner", "virtual-experience", "augmented-experience", "weather"];
  return { website: webSections.includes(section) ? `/travel/${section}` : "/travel" };
}


// The business directory, individual guides, and project profiles are web journeys.
// Retain the query and fragment so an old bookmark still opens the selected record.
export function businessGuideLink(path: string) {
  if (!/^\/(?:business-guides|investment|ntir|regulations)(?:[/?#]|$)/.test(path)) return;
  const url = new URL(path, "https://www.diasporaunlocked.com");
  const names: Record<string, string> = {
    farming: "Farming and food production guide", mining: "Mining supplies and services guide",
    construction: "Construction and home improvements guide", food: "Food processing and packaging guide",
    solar: "Solar and water services guide",
  };
  const slug = url.pathname.match(/^\/business-guides\/([^/]+)\/?$/)?.[1] ||
    (/^\/(?:investment|business-guides)\/?$/.test(url.pathname) ? url.hash.slice(1) : "");
  if (slug && Object.prototype.hasOwnProperty.call(names, slug)) return { path, title: names[slug] };
  if (url.pathname.startsWith("/ntir")) return {path, title: "Business directory"};
  if (url.pathname.startsWith("/regulations")) return {path, title: "Business regulations"};
  if (url.pathname.startsWith("/investment/projects/")) return {path, title: "Project profile"};
  if (url.pathname.startsWith("/investment/opportunities")) return {path, title: "Project profiles"};
  return { path, title: "Business guides" };
}
