export type Airport = { id: string; name: string; country: string };

function isAirport(entry: unknown): entry is Airport {
  if (!entry || typeof entry !== "object") return false;
  const airport = entry as Partial<Airport>;
  return (
    typeof airport.id === "string" &&
    /^[A-Z]{3}$/.test(airport.id) &&
    typeof airport.name === "string" &&
    airport.name.trim().length > 0 &&
    typeof airport.country === "string" &&
    /^[A-Z]{2}$/.test(airport.country)
  );
}

export function parseAirports(payload: unknown): Airport[] {
  const locations = (payload as { locations?: unknown } | null)?.locations;
  if (
    !Array.isArray(locations) ||
    !locations.length ||
    !locations.every(isAirport)
  ) {
    throw new Error("The airport directory is unavailable.");
  }
  if (
    new Set(locations.map((airport) => airport.id)).size !== locations.length
  ) {
    throw new Error("The airport directory contains duplicate airport codes.");
  }
  return locations;
}

function normalize(text: string) {
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchingAirports(
  query: string,
  airports: Airport[],
): Airport[] {
  const term = normalize(query);
  if (!term) return [];
  return airports.filter(
    (airport) =>
      airport.id.toLowerCase().startsWith(term) ||
      normalize(airport.name).includes(term) ||
      airport.country.toLowerCase() === term,
  );
}

// The provider validates manual codes when the directory is unavailable.
export function airportCode(query: string, airports: Airport[] | null): string {
  const code = query.trim().toUpperCase();
  if (
    /^[A-Z]{3}$/.test(code) &&
    (!airports || airports.some((airport) => airport.id === code))
  ) {
    return code;
  }
  const city = normalize(query);
  const matches = airports?.filter(
    (airport) => normalize(airport.name) === city,
  );
  return matches?.length === 1 ? matches[0].id : "";
}
