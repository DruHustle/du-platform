// Reset email tokens may be in a fragment so they do not reach server logs.
// Convert only that fragment to an in-memory navigation parameter.
export function navigationPath(path: string): string {
  const [base, fragment] = path.split("#", 2);
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
