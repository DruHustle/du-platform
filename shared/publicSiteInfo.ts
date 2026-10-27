import { travelCanonicalPaths, travelRedirects } from "./travelRoutes";
export const PUBLIC_SITE_ACTIONS = [
  {
    title: "Shop catalogue",
    href: "/shop/products",
    summary:
      "Published products and indicative prices; send an assisted order request. No payment is taken here.",
  },
  {
    title: "Travel Southern Africa",
    href: "/travel",
    summary:
      "Public flight and hotel searches, regional guides and private trip planning. Booking takes place with suppliers; hotel price completeness must be confirmed.",
  },
  {
    title: "Trip planner",
    href: "/travel/planner",
    summary:
      "Sample plans and indicative allowances, not live fares or bookings.",
  },
  {
    title: "Augmented reality tour",
    href: "/travel/augmented-experience",
    summary:
      "Camera-based AR demonstrations; local camera processing, not live navigation.",
  },
  {
    title: "Virtual experience",
    href: "/travel/virtual-experience",
    summary:
      "Clearly labelled 360-degree demos, including headset support where available.",
  },
  {
    title: "Business ideas",
    href: "/investment",
    summary: "Informational research ideas, not investment offers.",
  },
  {
    title: "Project profiles",
    href: "/investment/opportunities",
    summary:
      "Research starting points; independently check promoters and terms.",
  },
  {
    title: "Business directory",
    href: "/ntir",
    summary:
      "Research entries, not statutory registration or independent certification.",
  },
  {
    title: "Technology and Onesa",
    href: "/technology",
    summary: "Practical tools and the Onesa AI companion.",
  },
];
export function allowedOnesaHref(raw: string): string | null {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.length > 1000)
    return null;
  try {
    const url = new URL(raw, "https://www.diasporaunlocked.com");
    if (url.origin !== "https://www.diasporaunlocked.com") return null;
    url.pathname = travelRedirects[url.pathname] ?? url.pathname;
    const paths = [
      "/shop",
      ...PUBLIC_SITE_ACTIONS.map(item => item.href),
      ...travelCanonicalPaths,
    ];
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
