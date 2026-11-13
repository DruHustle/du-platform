import type { TravelQuote } from "./api";

type FlightLeg = { route: string[]; departureTime: string; arrivalTime: string; airlines: string[] };
export function flightLegSummary(leg: unknown): string | null {
  if (!leg || typeof leg !== "object") return null;
  const value = leg as Partial<FlightLeg>;
  if (!Array.isArray(value.route) || value.route.length < 2 ||
      !value.route.every(code => typeof code === "string" && /^[A-Z]{3}$/.test(code)) ||
      !Array.isArray(value.airlines) || !value.airlines.every(name => typeof name === "string") ||
      ![value.departureTime, value.arrivalTime].every(time => typeof time === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(time))) return null;
  const local = (time: string) => time.slice(0, 16).replace("T", " ");
  return [value.route.join(" → "), local(value.departureTime!) + " → " + local(value.arrivalTime!), value.airlines.join(", ")].filter(Boolean).join(" · ");
}
export function currentQuote(quote: TravelQuote, now = Date.now()) {
  return typeof quote.reviewAfter === "string" && Date.parse(quote.reviewAfter) > now;
}
export function validAwinReferral(raw: unknown, quote: TravelQuote): raw is string {
  if (typeof raw !== "string") return false;
  try {
    const url = new URL(raw);
    return url.origin === "https://www.awin1.com" && url.pathname === "/cread.php" &&
      !url.username && !url.password && url.searchParams.get("ued") === quote.bookingUrl &&
      url.searchParams.get("clickref") === quote.id && url.searchParams.get("cons") === "1";
  } catch {
    return false;
  }
}
