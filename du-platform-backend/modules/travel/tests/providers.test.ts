import { describe, expect, it, vi } from "vitest";
import { PublicTravelSearch, verifyTravelQuote } from "../providers";
import {
  defaultTravelCriteria,
  isSafeSupplierLink,
} from "../../../../shared/travel";
const now = Date.parse("2026-10-27T12:00:00Z");
const criteria = () => ({
  ...defaultTravelCriteria(),
  departure: "2027-01-15",
  returnDate: "2027-01-22",
  guestNationality: "DE",
});
const leg = (inbound = false) => ({
  route: inbound ? ["HRE", "FRA"] : ["FRA", "HRE"],
  departureTime: inbound ? "2027-01-22T21:00:00" : "2027-01-15T23:00:00",
  arrivalTime: inbound ? "2027-01-23T08:00:00" : "2027-01-16T10:00:00",
  durationSeconds: 39600,
  stops: 0,
  cabinClass: "Economy",
  segments: [
    { carrier: "XX", carrierName: "Synthetic airline", flightNumber: "XX1" },
  ],
});
const flight = () => ({
  id: "synthetic-provider-offer",
  price: 800,
  bookingUrl: "https://kiwi.com/u/synthetic",
  outbound: leg(),
  inbound: leg(true),
});
const flights = (rows: unknown[] = [flight()]) => ({
  currency: "EUR",
  passengers: { adults: 1, children: 0, infants: 0 },
  itineraries: rows,
});
const hotel = () => ({
  id: "synthetic-hotel-id",
  name: "Synthetic Harare hotel",
  price: 120,
  currency: "EUR",
  country: "ZW",
  url: "https://pilotplans.com/stays/synthetic?checkInDate=2027-01-15&checkOutDate=2027-01-22&rooms=1&currency=EUR",
});
function response(data: unknown, sse = true) {
  const envelope = {
    jsonrpc: "2.0",
    id: 1,
    result: { structuredContent: data },
  };
  return new Response(
    sse
      ? `event: message\r\ndata: ${JSON.stringify(envelope)}\r\n\r\n`
      : JSON.stringify(envelope),
    {
      headers: {
        "Content-Type": sse ? "text/event-stream" : "application/json",
      },
    }
  );
}
function service(data: unknown) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => response(data));
  return { search: new PublicTravelSearch(fetcher, () => now), fetcher };
}
describe("public read-only Travel providers", () => {
  it("normalizes verified party amounts and preserves local overnight dates without inventing baggage", async () => {
    const { search, fetcher } = service(flights());
    const result = await search.search("flights", criteria());
    expect(result.quotes[0]).toMatchObject({
      price: 800,
      currency: "EUR",
      priceBasis: "party-total",
      baggage: null,
      retrievedAt: "2026-10-27T12:00:00.000Z",
      reviewAfter: "2026-10-27T12:05:00.000Z",
    });
    expect(result.quotes[0].legs[0].arrivalTime).toBe("2027-01-16T10:00:00");
    expect(verifyTravelQuote(result.quotes[0])).toBe(true);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe("https://mcp.kiwi.com");
    expect(options?.redirect).toBe("error");
    const request = JSON.parse(String(options?.body));
    expect(request.params.name).toBe("search-flight");
    expect(request.params.arguments).toMatchObject({
      flyFrom: "FRA",
      flyTo: "HRE",
      departureDate: "15/01/2027",
      returnDate: "22/01/2027",
      allow_self_transfer: false,
      allow_diff_airport_connection: false,
    });
  });
  it("uses the provider's adult/child/infant age bands without dropping older children", async () => {
    const { search, fetcher } = service({
      ...flights(),
      passengers: { adults: 2, children: 1, infants: 1 },
    });
    await search.search("flights", { ...criteria(), childAges: [1, 7, 14] });
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).params.arguments
    ).toMatchObject({ adults: 2, children: 1, infants: 1 });
    await expect(
      search.search("flights", { ...criteria(), adults: 9, childAges: [14] })
    ).rejects.toMatchObject({ code: "TRAVEL_INVALID" });
    await expect(
      search.search("flights", { ...criteria(), childAges: [0, 1] })
    ).rejects.toMatchObject({ code: "TRAVEL_INVALID" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("omits return dates for one-way flights", async () => {
    const { search, fetcher } = service(
      flights([{ ...flight(), inbound: null }])
    );
    expect(
      (
        await search.search("flights", {
          ...criteria(),
          tripType: "one-way",
          returnDate: "",
        })
      ).quotes[0].legs
    ).toHaveLength(1);
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).params.arguments
    ).not.toHaveProperty("returnDate");
  });
  it("honours explicit flexible dates and rejects offers outside the requested window", async () => {
    const shifted = {
      ...flight(),
      outbound: {
        ...leg(),
        departureTime: "2027-01-16T23:00:00",
        arrivalTime: "2027-01-17T10:00:00",
      },
    };
    const { search, fetcher } = service(flights([shifted]));
    expect(
      (await search.search("flights", { ...criteria(), flightFlexDays: 1 }))
        .quotes[0].legs[0].departureTime
    ).toBe("2027-01-16T23:00:00");
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).params.arguments
        .departureDateFlexDays
    ).toBe(1);
    await expect(
      service(flights([shifted])).search.search("flights", criteria())
    ).rejects.toMatchObject({ code: "TRAVEL_PROVIDER_INVALID" });
  });
  it("sends exact hotel occupancy, country and nationality but does not invent a stay total", async () => {
    const { search, fetcher } = service({ hotels: [hotel()] });
    const result = await search.search("stays", {
      ...criteria(),
      adults: 2,
      rooms: 2,
      childAges: [7],
    });
    expect(result.quotes[0]).toMatchObject({
      price: 120,
      priceBasis: "unspecified",
      address: null,
      reviewRating: null,
    });
    expect(
      JSON.parse(String(fetcher.mock.calls[0][1]?.body)).params.arguments
    ).toMatchObject({
      location: "Harare, Zimbabwe",
      check_in: "2027-01-15",
      check_out: "2027-01-22",
      guests: 2,
      rooms: 2,
      children_ages: [7],
      guest_nationality: "DE",
      currency: "EUR",
      limit: 10,
    });
    for (const guestNationality of ["", "QQ", "ZZ", "EU"])
      await expect(
        search.search("stays", { ...criteria(), guestNationality })
      ).rejects.toMatchObject({ code: "TRAVEL_INVALID" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("distinguishes empty searches from malformed or failed supplier responses", async () => {
    expect(
      (await service(flights([])).search.search("flights", criteria())).quotes
    ).toEqual([]);
    for (const data of [
      {},
      { error: "supplier failure" },
      { ...flights(), currency: "USD" },
      { ...flights(), passengers: { adults: 2 } },
    ])
      await expect(
        service(data).search.search("flights", criteria())
      ).rejects.toBeInstanceOf(Error);
  });
  it.each([
    { bookingUrl: "https://evil.example/booking" },
    { bookingUrl: "https://kiwi.com.evil.example/u/x" },
    { bookingUrl: "https://kiwi.com/u/x?redirect=https://evil.example" },
    { price: -1 },
    { price: null },
    { outbound: { ...leg(), route: ["CPT", "HRE"] } },
    { outbound: { ...leg(), departureTime: "2027-02-30T10:00:00" } },
    { inbound: null },
  ])(
    "excludes invalid flights while preserving a safe partial response (%#)",
    async patch => {
      const result = await service(
        flights([flight(), { ...flight(), ...patch }])
      ).search.search("flights", criteria());
      expect(result.quotes).toHaveLength(1);
      expect(result.rejectedCount).toBe(1);
    }
  );
  it("rejects wrong-country hotels and unsafe hotel links rather than implying availability", async () => {
    for (const patch of [
      { country: "ZA" },
      { url: "https://pilotplans.com/stays/x?redirect=evil" },
    ])
      await expect(
        service({ hotels: [{ ...hotel(), ...patch }] }).search.search(
          "stays",
          criteria()
        )
      ).rejects.toMatchObject({ code: "TRAVEL_PROVIDER_INVALID" });
  });
  it("uses exact allowlists for provider handoff URLs", () => {
    expect(isSafeSupplierLink("Kiwi.com", flight().bookingUrl)).toBe(true);
    expect(isSafeSupplierLink("Pilot", hotel().url)).toBe(true);
    for (const url of [
      "http://kiwi.com/u/x",
      "https://user:pass@kiwi.com/u/x",
      "https://kiwi.com:444/u/x",
      "https://kiwi.com/u/x#fragment",
      "//kiwi.com/u/x",
    ])
      expect(isSafeSupplierLink("Kiwi.com", url)).toBe(false);
  });
  it("revalidates identical itineraries, surfaces changed prices, and rejects missing offers", async () => {
    let data = flights();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response(data));
    const search = new PublicTravelSearch(fetcher, () => now);
    const original = (await search.search("flights", criteria())).quotes[0];
    data = flights([{ ...flight(), price: 900 }]);
    expect(await search.revalidate(original)).toMatchObject({
      changed: true,
      quote: { price: 900 },
    });
    data = flights([]);
    await expect(search.revalidate(original)).rejects.toMatchObject({
      code: "TRAVEL_OFFER_EXPIRED",
    });
    expect(verifyTravelQuote({ ...original, price: 1 })).toBe(false);
    await expect(
      search.revalidate({ ...original, price: 1 })
    ).rejects.toMatchObject({ code: "TRAVEL_INVALID" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("supports SSE text fallbacks and plain JSON without executing supplier instructions", async () => {
    for (const sse of [true, false]) {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(response(flights(), sse));
      expect(
        (
          await new PublicTravelSearch(fetcher, () => now).search(
            "flights",
            criteria()
          )
        ).quotes
      ).toHaveLength(1);
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          `data: ${JSON.stringify({ jsonrpc: "2.0", id: 1, result: { content: [{ type: "text", text: JSON.stringify(flights()) }] } })}\n\n`
        )
      );
    expect(
      (
        await new PublicTravelSearch(fetcher, () => now).search(
          "flights",
          criteria()
        )
      ).quotes
    ).toHaveLength(1);
  });
  it("fails closed on provider blocks, invalid envelopes, oversized responses and cancellation", async () => {
    for (const res of [
      new Response("blocked", { status: 403 }),
      new Response("x".repeat(1048577)),
      new Response('data: {"id":2,"result":{}}\n\n'),
      new Response('data: {"id":1,"result":{"isError":true}}\n\n'),
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(res);
      await expect(
        new PublicTravelSearch(fetcher, () => now).search("flights", criteria())
      ).rejects.toBeInstanceOf(Error);
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (_url, options) => {
        options?.signal?.throwIfAborted();
        throw new Error("network unavailable");
      });
    const controller = new AbortController();
    controller.abort();
    await expect(
      new PublicTravelSearch(fetcher, () => now).search(
        "flights",
        criteria(),
        controller.signal
      )
    ).rejects.toMatchObject({ code: "TRAVEL_PROVIDER_UNAVAILABLE" });
  });
  it("bounds concurrency and releases the slot after failures without retrying", async () => {
    const pending: Array<(value: Response) => void> = [];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(() => new Promise(resolve => pending.push(resolve)));
    const search = new PublicTravelSearch(fetcher, () => now);
    const first = search.search("flights", criteria());
    const second = search.search("flights", criteria());
    await expect(search.search("flights", criteria())).rejects.toMatchObject({
      code: "TRAVEL_BUSY",
    });
    pending[0](response(flights()));
    pending[1](response(flights()));
    await Promise.all([first, second]);
    fetcher.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(search.search("flights", criteria())).rejects.toBeInstanceOf(
      Error
    );
    fetcher.mockResolvedValueOnce(response(flights()));
    expect((await search.search("flights", criteria())).quotes).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("stops after the daily process ceiling and resets only on a new UTC day", async () => {
    let clock = now;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response(flights([])));
    const search = new PublicTravelSearch(fetcher, () => clock);
    for (let i = 0; i < 500; i++) await search.search("flights", criteria());
    await expect(search.search("flights", criteria())).rejects.toMatchObject({
      code: "TRAVEL_BUSY",
    });
    expect(fetcher).toHaveBeenCalledTimes(500);
    clock += 86400000;
    expect((await search.search("flights", criteria())).quotes).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(501);
  });
});
