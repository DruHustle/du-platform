import { describe, it, expect, vi } from "vitest";
import { createServer } from "node:http";
import {
  WeatherProvider,
  normalizeWeather,
  weatherCondition,
} from "../provider";
import { MemoryWeatherCache } from "../cache";
import { createWeatherRouter } from "../routes";
import { weatherDays } from "../../../contracts/weather";
import express from "express";
const initial = Date.parse("2026-10-27T12:00:00Z");
const coordinates = { latitude: -17.825, longitude: 31.033 };
function raw() {
  return {
    geometry: { type: "Point", coordinates: [31.033, -17.825, 1484] },
    properties: {
      meta: {
        updated_at: "2026-10-27T11:00:00Z",
        units: {
          air_temperature: "celsius",
          wind_speed: "m/s",
          precipitation_amount: "mm",
        },
      },
      timeseries: Array.from({ length: 90 }, (_, n) => ({
        time: new Date(initial + n * 3600000).toISOString(),
        data: {
          instant: {
            details: {
              air_temperature: 20 + (n % 8),
              wind_speed: 5,
              relative_humidity: 70,
            },
          },
          next_1_hours: {
            summary: { symbol_code: "rainshowers_day" },
            details: { precipitation_amount: 1.2 },
          },
          next_6_hours: {
            summary: { symbol_code: "heavyrain_day" },
            details: { precipitation_amount: 99 },
          },
        },
      })),
    },
  };
}
function response(data: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...headers },
  });
}
describe("weather data and public-provider controls", () => {
  it("normalizes Celsius, km/h and the shortest rain interval without overlapping sums", () => {
    const result = normalizeWeather(
      raw(),
      coordinates.latitude,
      coordinates.longitude,
      initial
    );
    expect(result.timezone).toBe("Africa/Harare");
    const old = raw();
    old.properties.meta.updated_at = new Date(
      initial - 13 * 3600000
    ).toISOString();
    expect(normalizeWeather(old, -17.825, 31.033, initial).stale).toBe(true);
    const night = raw();
    night.properties.timeseries[0].data.next_1_hours.summary.symbol_code =
      "fair_night";
    expect(
      normalizeWeather(night, -17.825, 31.033, initial).points[0]
    ).toMatchObject({ condition: "fair", night: true });
    expect(result.points[0]).toMatchObject({
      temperature: 20,
      windKmh: 18,
      humidity: 70,
      precipitationMm: 1.2,
      intervalHours: 1,
      condition: "rain",
    });
    const incomplete = raw();
    delete (incomplete.properties.timeseries[0].data.instant.details as any)
      .wind_speed;
    delete (incomplete.properties.timeseries[0].data as any).next_1_hours;
    delete (incomplete.properties.timeseries[0].data as any).next_6_hours;
    expect(
      normalizeWeather(incomplete, -17.825, 31.033, initial).points[0]
    ).toMatchObject({
      windKmh: null,
      precipitationMm: null,
      condition: "unknown",
      intervalHours: null,
    });
  });
  it("rejects malformed measurements, wrong units and duplicate times", () => {
    const wrong = raw();
    wrong.properties.meta.units.air_temperature = "fahrenheit";
    expect(() => normalizeWeather(wrong, -17.825, 31.033, initial)).toThrow();
    expect(() => normalizeWeather(raw(), -33.925, 18.424, initial)).toThrow(
      "WEATHER_UNAVAILABLE"
    );
    const duplicate = raw();
    duplicate.properties.timeseries[1].time =
      duplicate.properties.timeseries[0].time;
    expect(() =>
      normalizeWeather(duplicate, -17.825, 31.033, initial)
    ).toThrow();
    const invalid = raw();
    invalid.properties.timeseries[0].data.instant.details.air_temperature = 999;
    expect(() => normalizeWeather(invalid, -17.825, 31.033, initial)).toThrow();
  });
  it("groups dates in the destination timezone across the date line", () => {
    const source = raw();
    source.geometry.coordinates = [174.764, -36.85, 10];
    const forecast = normalizeWeather(source, -36.85, 174.764, initial);
    expect(forecast.timezone).toBe("Pacific/Auckland");
    expect(weatherDays(forecast, initial)[0].date).toBe("2026-10-28");
    expect(weatherDays(forecast, initial)[0].low).toBe(20);
    expect(weatherDays(forecast, initial)[0].high).toBe(27);
    expect(weatherCondition("heavysnowshowersandthunder_night")).toBe(
      "thunder"
    );
  });
  it("coalesces concurrent forecasts and respects cache expiry and coordinate precision", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      response(raw(), {
        Expires: new Date(initial + 5 * 3600000).toUTCString(),
      })
    );
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => initial
    );
    await Promise.all([
      provider.forecast({ ...coordinates, latitude: -17.825123 }),
      provider.forecast(coordinates),
    ]);
    await provider.forecast(coordinates);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("lat")).toBe("-17.825");
    expect(options?.headers).toMatchObject({
      "User-Agent": expect.stringContaining("diasporaunlocked.com"),
    });
    expect(options?.redirect).toBe("error");
  });
  it("revalidates conditionally only after expiry and handles 304 without inventing a new forecast", async () => {
    let now = initial;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response(raw(), {
          "Last-Modified": new Date(initial - 3600000).toUTCString(),
        })
      )
      .mockImplementation(async () => new Response(null, { status: 304 }));
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => now
    );
    const first = await provider.forecast(coordinates);
    now += 3 * 3600000 - 1;
    await provider.forecast(coordinates);
    expect(fetcher).toHaveBeenCalledTimes(1);
    now += 2;
    const next = await provider.forecast(coordinates);
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({
      "If-Modified-Since": new Date(initial - 3600000).toUTCString(),
    });
    expect(next.issuedAt).toBe(first.issuedAt);
    expect(next.stale).toBe(false);
    now = initial + 13 * 3600000;
    const older = await provider.forecast(coordinates);
    expect(older.issuedAt).toBe(first.issuedAt);
    expect(older.stale).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it("never serves an entirely expired forecast as fresh even if upstream cache expiry is later", async () => {
    let now = initial;
    const source = raw();
    source.properties.timeseries = source.properties.timeseries.slice(0, 2);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response(source, {
        Expires: new Date(initial + 5 * 3600000).toUTCString(),
      })
    );
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => now
    );
    await provider.forecast(coordinates);
    now += 2 * 3600000;
    await expect(provider.forecast(coordinates)).rejects.toThrow(
      "WEATHER_UNAVAILABLE"
    );
    // Honour the upstream reuse period while refusing unusable cached data.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("marks fallback data stale and refuses it after a day", async () => {
    let now = initial;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(raw()))
      .mockRejectedValue(new Error("offline"));
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => now
    );
    await provider.forecast(coordinates);
    now += 4 * 3600000;
    expect((await provider.forecast(coordinates)).stale).toBe(true);
    await provider.forecast(coordinates);
    expect(fetcher).toHaveBeenCalledTimes(2);
    now += 86400000;
    await expect(provider.forecast(coordinates)).rejects.toThrow();
  });
  it("bounds upstream response size and does not follow redirects or accept out-of-range coordinates", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("x".repeat(1048577)));
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => initial
    );
    await expect(provider.forecast(coordinates)).rejects.toThrow();
    await expect(
      provider.forecast({ latitude: 100, longitude: 20 })
    ).rejects.toThrow("WEATHER_INVALID");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("releases an upstream error response body instead of retaining the connection", async () => {
    const cancel = vi.fn();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(new ReadableStream({ cancel }), { status: 429 })
      );
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => initial
    );
    await expect(provider.forecast(coordinates)).rejects.toThrow(
      "WEATHER_BUSY"
    );
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("caches explicit place searches and applies a shared upstream spacing limit", async () => {
    let now = initial;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () =>
      response([
        {
          place_id: 123,
          lat: "-17.825",
          lon: "31.033",
          name: "Harare",
          display_name: "Harare, Zimbabwe",
          address: { country: "Zimbabwe" },
        },
      ])
    );
    const provider = new WeatherProvider(
      new MemoryWeatherCache(),
      fetcher,
      () => now
    );
    const result = await provider.places("Harare");
    expect(result[0].timezone).toBe("Africa/Harare");
    await provider.places("harare");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(provider.places("Bulawayo")).rejects.toThrow("WEATHER_BUSY");
    now += 1101;
    await provider.places("Bulawayo");
    expect(fetcher).toHaveBeenCalledTimes(2);
    await expect(provider.places("person@example.com")).rejects.toThrow(
      "WEATHER_INVALID"
    );
    expect(new URL(String(fetcher.mock.calls[0][0])).hostname).toBe(
      "nominatim.openstreetmap.org"
    );
  });
  it("supports operator-configured HTTPS geocoders without a user-controlled upstream URL", () => {
    expect(
      () =>
        new WeatherProvider(
          undefined,
          fetch,
          Date.now,
          "http://example.com/search"
        )
    ).toThrow();
    expect(
      () =>
        new WeatherProvider(
          undefined,
          fetch,
          Date.now,
          "https://user:secret@example.com/search"
        )
    ).toThrow();
  });
  it("serves bounded anonymous weather requests with private responses and truthful failure statuses", async () => {
    const service = new WeatherProvider(
      new MemoryWeatherCache(),
      vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
      () => initial
    );
    const app = express();
    app.use(express.json());
    app.use("/api/weather", createWeatherRouter(service));
    const server = createServer(app);
    await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    try {
      for (const [path, body, status] of [
        ["forecast", { latitude: 100, longitude: 0 }, 400],
        ["forecast", coordinates, 503],
        ["places", { query: "x" }, 400],
      ] as const) {
        const result = await fetch(`${base}/api/weather/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        expect(result.status).toBe(status);
        expect(result.headers.get("cache-control")).toContain("no-store");
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>(done => server.close(() => done()));
    }
  });
});
