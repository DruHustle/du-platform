const legacyTravelRoutes: Record<string, string> = {
  "/tourism": "/travel",
  "/onesa-ai-book-trip": "/travel/planner",
  "/onesa-ai-tourism-virtual-experience": "/travel/virtual-experience",
  "/onesa-ai-tourism-virtual-experince": "/travel/virtual-experience",
  "/onesa-ai-tourism-augmented-experience": "/travel/augmented-experience",
  "/onesa-ai-tourism-augmented-experince": "/travel/augmented-experience",
};

export const travelRedirects: Record<string, string> = Object.fromEntries(
  Object.entries(legacyTravelRoutes).flatMap(([source, destination]) =>
    [source, source + "/", source + ".html"].map(alias => [alias, destination])
  )
);
export function resolveTravelRedirect(pathname: string): string | null {
  if (travelRedirects[pathname]) return travelRedirects[pathname];
  const clean = pathname.replace(/(?:\.html|\/)$/, "");
  const canonical = [
    "/travel",
    "/travel/flights",
    "/travel/stays",
    "/travel/car-hire",
    "/travel/explore",
    "/travel/my-trips",
    "/travel/planner",
    "/travel/virtual-experience",
    "/travel/augmented-experience",
  ];
  return clean !== pathname && canonical.includes(clean) ? clean : null;
}
