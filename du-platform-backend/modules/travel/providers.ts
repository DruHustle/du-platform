import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "../../contracts/validation";
import {
  travelLocations,
  validateTravel,
  isTravelNationality,
  travelQuoteSchema,
  type TravelCriteria,
  type TravelQuote,
  type TravelResults,
} from "../../contracts/travel";
import { resolveJwtSecret } from "../../utils/jwtSecret";

const endpoints = {
  "Kiwi.com": "https://mcp.kiwi.com",
  Pilot: "https://mcp.pilotplans.com/mcp",
} as const;
export class TravelProviderError extends Error {
  constructor(
    public code:
      | "TRAVEL_PROVIDER_UNAVAILABLE"
      | "TRAVEL_PROVIDER_INVALID"
      | "TRAVEL_BUSY"
      | "TRAVEL_INVALID"
      | "TRAVEL_OFFER_EXPIRED"
  ) {
    super(code);
  }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, value]) => value !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function signature(quote: Omit<TravelQuote, "signature">) {
  return createHmac("sha256", resolveJwtSecret())
    .update("du-travel-quote-v1\n" + canonical(quote))
    .digest("hex");
}
export function verifyTravelQuote(value: unknown): value is TravelQuote {
  const parsed = travelQuoteSchema.safeParse(value);
  if (!parsed.success) return false;
  const { signature: received, ...quote } = parsed.data;
  return timingSafeEqual(
    Buffer.from(signature(quote), "hex"),
    Buffer.from(received, "hex")
  );
}
const text = z.string().max(12000);
const amount = z.number().finite().nonnegative().max(10000000);
const count = z.number().int().nonnegative().max(100);
const rawLeg = z.object({
  route: z.array(z.string()).min(2).max(12),
  departureTime: text,
  arrivalTime: text,
  durationSeconds: z.number().int().nonnegative(),
  stops: count,
  cabinClass: text.nullish(),
  segments: z
    .array(
      z.object({
        carrierName: text.nullish(),
        carrier: text.nullish(),
        flightNumber: text.nullish(),
      })
    )
    .max(12),
});
const flight = z.object({
  id: text.min(1),
  price: amount,
  bookingUrl: text,
  outbound: rawLeg,
  inbound: rawLeg.nullish(),
  baggage: z
    .object({
      personalItem: count.nullish(),
      cabinBag: count.nullish(),
      checkedBag: count.nullish(),
    })
    .nullish(),
});
const hotel = z.object({
  id: text.min(1),
  name: z.string().min(1).max(250),
  price: amount,
  currency: z.string(),
  url: text,
  address: z.string().max(500).nullish(),
  country: z.string().nullish(),
  rating: z.number().min(0).max(10).nullish(),
  reviewCount: z.number().int().nonnegative().max(10000000).nullish(),
});
function payload(raw: string, requestId: number): unknown {
  let envelope: any;
  try {
    if (raw.trimStart().startsWith("{")) envelope = JSON.parse(raw);
    else {
      const frames = raw.replace(/\r\n/g, "\n").split("\n\n");
      for (const frame of frames) {
        const lines = frame
          .split("\n")
          .filter(line => line.startsWith("data:"));
        if (!lines.length) continue;
        const item = JSON.parse(
          lines.map(line => line.slice(5).trimStart()).join("\n")
        );
        if (item.id === requestId) envelope = item;
      }
    }
    if (
      !envelope ||
      envelope.id !== requestId ||
      envelope.error ||
      envelope.result?.isError
    )
      throw new Error();
    const result = envelope.result;
    if (result.structuredContent) return result.structuredContent;
    const block = result.content?.find(
      (item: any) => item.type === "text" || typeof item.text === "string"
    );
    return JSON.parse(block.text);
  } catch {
    throw new TravelProviderError("TRAVEL_PROVIDER_INVALID");
  }
}

// Fixed, read-only tools on explicitly public vendor endpoints. No generic MCP
// proxy, arbitrary URL, booking tool, feedback tool, polling or paid API access.
export class PublicTravelSearch {
  private active = 0;
  private dailyCount = 0;
  private day = "";
  constructor(
    private fetcher: typeof fetch = fetch,
    private clock = Date.now
  ) {}
  private async call(
    provider: keyof typeof endpoints,
    name: string,
    args: object,
    signal?: AbortSignal
  ) {
    const today = new Date(this.clock()).toISOString().slice(0, 10);
    if (this.day !== today) {
      this.day = today;
      this.dailyCount = 0;
    }
    if (this.active >= 2 || this.dailyCount >= 500)
      throw new TravelProviderError("TRAVEL_BUSY");
    this.active++;
    this.dailyCount++;
    try {
      const response = await this.fetcher(endpoints[provider], {
        method: "POST",
        redirect: "error",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "MCP-Protocol-Version": "2025-06-18",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name, arguments: args },
        }),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(25000)])
          : AbortSignal.timeout(25000),
      });
      if (!response.ok || !response.body)
        throw new TravelProviderError("TRAVEL_PROVIDER_UNAVAILABLE");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let size = 0,
        body = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1048576)
            throw new TravelProviderError("TRAVEL_PROVIDER_INVALID");
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
      }
      const data: any = payload(body, 1);
      if (!data || data.error)
        throw new TravelProviderError("TRAVEL_PROVIDER_UNAVAILABLE");
      return data;
    } catch (e) {
      if (e instanceof TravelProviderError) throw e;
      throw new TravelProviderError("TRAVEL_PROVIDER_UNAVAILABLE");
    } finally {
      this.active--;
    }
  }
  async search(
    category: "flights" | "stays",
    criteria: TravelCriteria,
    signal?: AbortSignal
  ): Promise<TravelResults> {
    if (
      !validateTravel(
        criteria,
        category,
        new Date(this.clock()).toISOString().slice(0, 10)
      ).success
    )
      throw new TravelProviderError("TRAVEL_INVALID");
    const retrievedAt = new Date(this.clock()).toISOString();
    const reviewAfter = new Date(this.clock() + 300000).toISOString();
    const provider = category === "flights" ? "Kiwi.com" : "Pilot";
    let data: any, rows: unknown[];
    const adults =
      criteria.adults + criteria.childAges.filter(age => age >= 12).length;
    const children = criteria.childAges.filter(
      age => age >= 2 && age < 12
    ).length;
    const infants = criteria.childAges.filter(age => age < 2).length;
    if (category === "flights") {
      if (adults > 9 || infants > 4 || infants > adults)
        throw new TravelProviderError("TRAVEL_INVALID");
      const date = (iso: string) => iso.split("-").reverse().join("/");
      data = await this.call(
        provider,
        "search-flight",
        {
          flyFrom: criteria.origin,
          flyTo: criteria.destination,
          departureDate: date(criteria.departure),
          ...(criteria.tripType === "return"
            ? { returnDate: date(criteria.returnDate) }
            : {}),
          adults,
          children,
          infants,
          currency: criteria.currency,
          locale: "en",
          sort: "price",
          allow_self_transfer: false,
          allow_diff_airport_connection: false,
          departureDateFlexDays: criteria.flightFlexDays ?? 0,
          returnDateFlexDays:
            criteria.tripType === "return" ? (criteria.flightFlexDays ?? 0) : 0,
        },
        signal
      );
      if (
        data.currency !== criteria.currency ||
        data.passengers?.adults !== adults ||
        data.passengers?.children !== children ||
        data.passengers?.infants !== infants
      )
        throw new TravelProviderError("TRAVEL_PROVIDER_INVALID");
      rows = data.itineraries;
    } else {
      if (
        !criteria.guestNationality ||
        !isTravelNationality(criteria.guestNationality)
      )
        throw new TravelProviderError("TRAVEL_INVALID");
      const location = travelLocations.find(
        l => l.id === criteria.destination
      )!;
      const country = new Intl.DisplayNames(["en"], { type: "region" }).of(
        location.country
      );
      data = await this.call(
        provider,
        "search_hotels",
        {
          location: `${location.name}, ${country}`,
          check_in: criteria.departure,
          check_out: criteria.returnDate,
          guests: criteria.adults,
          rooms: criteria.rooms,
          children_ages: criteria.childAges,
          currency: criteria.currency,
          guest_nationality: criteria.guestNationality,
          limit: 10,
        },
        signal
      );
      rows = data.hotels;
    }
    if (!Array.isArray(rows) || rows.length > 100)
      throw new TravelProviderError("TRAVEL_PROVIDER_INVALID");
    const quotes: TravelQuote[] = [];
    let rejectedCount = 0;
    const identities = new Set<string>();
    for (const row of rows.slice(0, 20)) {
      try {
        let base: Omit<TravelQuote, "signature" | "identity" | "id">,
          identityData: unknown;
        if (category === "flights") {
          const f = flight.parse(row);
          if ((criteria.tripType === "return") !== Boolean(f.inbound))
            throw new Error();
          const legs = [f.outbound, ...(f.inbound ? [f.inbound] : [])];
          const withinRange = (actual: string, expected: string) => {
            const distance =
              Math.abs(
                Date.parse(actual.slice(0, 10) + "T00:00:00Z") -
                  Date.parse(expected + "T00:00:00Z")
              ) / 86400000;
            return (
              distance <= (criteria.flightFlexDays ?? 0) &&
              actual.slice(0, 10) >=
                new Date(this.clock()).toISOString().slice(0, 10)
            );
          };
          for (const [i, leg] of Array.from(legs.entries()))
            if (
              leg.route[0] !== (i ? criteria.destination : criteria.origin) ||
              leg.route.at(-1) !==
                (i ? criteria.origin : criteria.destination) ||
              !withinRange(
                leg.departureTime,
                i ? criteria.returnDate : criteria.departure
              )
            )
              throw new Error();
          identityData = legs.map(l => ({
            route: l.route,
            departure: l.departureTime,
            arrival: l.arrivalTime,
            cabin: l.cabinClass ?? null,
            flights: l.segments.map(s => [s.carrier, s.flightNumber]),
          }));
          base = {
            provider,
            category,
            providerReference: f.id,
            criteria,
            title: `${criteria.origin} → ${criteria.destination}`,
            price: f.price,
            currency: criteria.currency,
            priceBasis: "party-total",
            retrievedAt,
            reviewAfter,
            bookingUrl: f.bookingUrl,
            legs: legs.map(l => ({
              route: l.route,
              departureTime: l.departureTime,
              arrivalTime: l.arrivalTime,
              durationSeconds: l.durationSeconds,
              stops: l.stops,
              cabin: l.cabinClass ?? null,
              airlines: Array.from(
                new Set(
                  l.segments
                    .map(s => s.carrierName || s.carrier)
                    .filter((v): v is string => Boolean(v))
                )
              ),
            })),
            baggage: f.baggage
              ? {
                  personalItem: f.baggage.personalItem ?? null,
                  cabinBag: f.baggage.cabinBag ?? null,
                  checkedBag: f.baggage.checkedBag ?? null,
                }
              : null,
            address: null,
            reviewRating: null,
            reviewCount: null,
          };
        } else {
          const h = hotel.parse(row);
          if (
            !(["EUR", "GBP", "USD", "ZAR"] as string[]).includes(h.currency) ||
            h.country !==
              travelLocations.find(l => l.id === criteria.destination)!.country
          )
            throw new Error();
          identityData = [h.name, h.address ?? null, h.country, criteria];
          base = {
            provider,
            category,
            providerReference: h.id,
            criteria,
            title: h.name,
            price: h.price,
            currency: h.currency as TravelQuote["currency"],
            priceBasis: "unspecified",
            retrievedAt,
            reviewAfter,
            bookingUrl: h.url,
            legs: [],
            baggage: null,
            address: h.address ?? null,
            reviewRating: h.rating ?? null,
            reviewCount: h.reviewCount ?? null,
          };
        }
        const identity = createHash("sha256")
          .update(canonical(identityData))
          .digest("hex");
        if (identities.has(identity)) {
          rejectedCount++;
          continue;
        }
        const unsigned = { ...base, id: randomUUID(), identity };
        const quote = travelQuoteSchema.parse({
          ...unsigned,
          signature: signature(unsigned),
        });
        identities.add(identity);
        quotes.push(quote);
      } catch {
        rejectedCount++;
      }
    }
    if (rows.length && !quotes.length)
      throw new TravelProviderError("TRAVEL_PROVIDER_INVALID");
    return {
      provider,
      category,
      retrievedAt,
      quotes,
      rejectedCount: rejectedCount + Math.max(0, rows.length - 20),
    };
  }
  async revalidate(quote: TravelQuote, signal?: AbortSignal) {
    if (!verifyTravelQuote(quote))
      throw new TravelProviderError("TRAVEL_INVALID");
    const current = await this.search(quote.category, quote.criteria, signal);
    const match = current.quotes.find(item => item.identity === quote.identity);
    if (!match) throw new TravelProviderError("TRAVEL_OFFER_EXPIRED");
    return {
      quote: match,
      changed: match.price !== quote.price || match.currency !== quote.currency,
    };
  }
}
export const publicTravelSearch = new PublicTravelSearch();
