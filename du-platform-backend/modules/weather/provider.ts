import { createHash } from "node:crypto";
import lookupTimezone from "tz-lookup";
import { z } from "../../../shared/validation";
import {
  weatherCoordinateSchema,
  weatherForecastSchema,
  weatherPlaceSchema,
  type WeatherForecast,
  type WeatherPoint,
} from "../../../shared/weather";
import {
  MemoryWeatherCache,
  type WeatherCache,
  type WeatherCacheEntry,
} from "./cache";
const userAgent =
  "DiasporaUnlocked/1.0 (https://www.diasporaunlocked.com; info@diasporaunlocked.com)";
export class WeatherError extends Error {
  constructor(
    public code: "WEATHER_BUSY" | "WEATHER_UNAVAILABLE" | "WEATHER_INVALID"
  ) {
    super(code);
  }
}
const instant = z.object({
  air_temperature: z.number().finite().min(-100).max(70),
  relative_humidity: z.number().min(0).max(100).optional(),
  wind_speed: z.number().min(0).max(140).optional(),
});
const interval = z.object({
  summary: z
    .object({
      symbol_code: z
        .string()
        .regex(/^[a-z_]+$/)
        .max(80),
    })
    .optional(),
  details: z
    .object({ precipitation_amount: z.number().min(0).max(2000).optional() })
    .optional(),
});
const rawForecast = z.object({
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.array(z.number().finite()).min(2).max(3),
  }),
  properties: z.object({
    meta: z.object({
      updated_at: z.string().datetime(),
      units: z.object({
        air_temperature: z.literal("celsius"),
        wind_speed: z.literal("m/s"),
        precipitation_amount: z.literal("mm"),
      }),
    }),
    timeseries: z
      .array(
        z.object({
          time: z.string().datetime(),
          data: z.object({
            instant: z.object({ details: instant }),
            next_1_hours: interval.optional(),
            next_6_hours: interval.optional(),
            next_12_hours: interval.optional(),
          }),
        })
      )
      .min(1)
      .max(300),
  }),
});
const rawPlaces = z
  .array(
    z.object({
      place_id: z.number(),
      lat: z.coerce.number().min(-90).max(90),
      lon: z.coerce.number().min(-180).max(180),
      name: z.string().max(250).optional(),
      display_name: z.string().max(1000),
      address: z
        .object({
          country: z.string().max(100).optional(),
          state: z.string().max(200).optional(),
        })
        .optional(),
    })
  )
  .max(5);
export function weatherCondition(symbol: string): WeatherPoint["condition"] {
  if (symbol.includes("thunder")) return "thunder";
  if (symbol.includes("snow")) return "snow";
  if (symbol.includes("sleet")) return "sleet";
  if (symbol.includes("rain")) return "rain";
  if (symbol.startsWith("clearsky")) return "clear";
  if (symbol.startsWith("fair")) return "fair";
  if (symbol.startsWith("partlycloudy")) return "partlycloudy";
  if (symbol.startsWith("cloudy")) return "cloudy";
  if (symbol.startsWith("fog")) return "fog";
  return "unknown";
}
export function normalizeWeather(
  raw: unknown,
  latitude: number,
  longitude: number,
  fetchedAt: number
): WeatherForecast {
  const parsed = rawForecast.parse(raw);
  if (
    Math.abs(parsed.geometry.coordinates[0] - longitude) > 0.002 ||
    Math.abs(parsed.geometry.coordinates[1] - latitude) > 0.002
  )
    throw new WeatherError("WEATHER_UNAVAILABLE");
  const issuedAt = Date.parse(parsed.properties.meta.updated_at);
  if (issuedAt > fetchedAt + 900000 || issuedAt < fetchedAt - 86400000)
    throw new WeatherError("WEATHER_UNAVAILABLE");
  const points = parsed.properties.timeseries
    .map(p => {
      const block =
        p.data.next_1_hours || p.data.next_6_hours || p.data.next_12_hours;
      const intervalHours = p.data.next_1_hours
        ? 1
        : p.data.next_6_hours
          ? 6
          : p.data.next_12_hours
            ? 12
            : null;
      return {
        time: p.time,
        temperature: p.data.instant.details.air_temperature,
        humidity: p.data.instant.details.relative_humidity ?? null,
        windKmh:
          p.data.instant.details.wind_speed === undefined
            ? null
            : Math.round(p.data.instant.details.wind_speed * 36) / 10,
        precipitationMm: block?.details?.precipitation_amount ?? null,
        intervalHours,
        condition: weatherCondition(block?.summary?.symbol_code || ""),
        night: Boolean(block?.summary?.symbol_code?.endsWith("_night")),
      };
    })
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  if (new Set(points.map(p => p.time)).size !== points.length)
    throw new WeatherError("WEATHER_UNAVAILABLE");
  return weatherForecastSchema.parse({
    latitude,
    longitude,
    timezone: lookupTimezone(latitude, longitude),
    issuedAt: parsed.properties.meta.updated_at,
    fetchedAt: new Date(fetchedAt).toISOString(),
    stale: fetchedAt - issuedAt > 12 * 3600000,
    points,
  });
}
export class WeatherProvider {
  private pending = new Map<string, Promise<unknown>>();
  private geocoderAt = -Infinity;
  private active = 0;
  private geocoderBusy = false;
  constructor(
    private cache: WeatherCache = new MemoryWeatherCache(),
    private fetcher: typeof fetch = fetch,
    private clock = Date.now,
    private geocoderUrl = "https://nominatim.openstreetmap.org/search"
  ) {
    const url = new URL(geocoderUrl);
    if (url.protocol !== "https:" || url.username || url.password)
      throw new Error(
        "Weather geocoder requires an HTTPS endpoint without embedded credentials"
      );
  }
  private async request(url: string, headers: Record<string, string> = {}) {
    if (this.active >= 4) throw new WeatherError("WEATHER_BUSY");
    this.active++;
    try {
      const response = await this.fetcher(url, {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
          ...headers,
        },
        redirect: "error",
        signal: AbortSignal.timeout(12000),
      });
      if (response.status === 304) return { response, data: null };
      if (response.status !== 200)
        throw new WeatherError(
          response.status === 429 ? "WEATHER_BUSY" : "WEATHER_UNAVAILABLE"
        );
      if (!response.body) throw new WeatherError("WEATHER_UNAVAILABLE");
      const reader = response.body.getReader();
      let size = 0,
        body = "";
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1048576) throw new WeatherError("WEATHER_UNAVAILABLE");
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally {
        await reader.cancel().catch(() => {});
      }
      return { response, data: JSON.parse(body) };
    } finally {
      this.active--;
    }
  }
  private async shared<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) return existing as Promise<T>;
    if (this.pending.size >= 16) throw new WeatherError("WEATHER_BUSY");
    const pending = fn();
    this.pending.set(key, pending);
    try {
      return await pending;
    } finally {
      this.pending.delete(key);
    }
  }
  async places(query: string) {
    const q = query.trim().replace(/\s+/g, " ");
    if (
      q.length < 2 ||
      q.length > 100 ||
      /[\u0000-\u001f<>@]|https?:\/\//i.test(q)
    )
      throw new WeatherError("WEATHER_INVALID");
    const key =
      "places:" + createHash("sha256").update(q.toLowerCase()).digest("hex");
    return this.shared(key, async () => {
      const saved = await this.cache.get(key);
      if (saved && saved.expiresAt > this.clock())
        return z.array(weatherPlaceSchema).parse(saved.value);
      // One upstream request at a time, no autocomplete or automatic retries.
      if (this.geocoderBusy || this.clock() - this.geocoderAt < 1100)
        throw new WeatherError("WEATHER_BUSY");
      this.geocoderAt = this.clock();
      const url = new URL(this.geocoderUrl);
      url.search = new URLSearchParams({
        q,
        format: "jsonv2",
        addressdetails: "1",
        limit: "5",
        "accept-language": "en",
      }).toString();
      this.geocoderBusy = true;
      try {
        const { data } = await this.request(url.toString());
        const places = rawPlaces.parse(data).map(p =>
          weatherPlaceSchema.parse({
            id: String(p.place_id),
            name: p.name
              ? `${p.name}${p.address?.state && p.address.state !== p.name ? ", " + p.address.state : ""}`
              : p.display_name.split(",").slice(0, 2).join(","),
            country: p.address?.country || "",
            latitude: p.lat,
            longitude: p.lon,
            timezone: lookupTimezone(p.lat, p.lon),
          })
        );
        await this.cache.put(key, {
          value: places,
          fetchedAt: this.clock(),
          expiresAt: this.clock() + 86400000,
        });
        return places;
      } finally {
        this.geocoderBusy = false;
      }
    });
  }
  async forecast(value: unknown) {
    const input = weatherCoordinateSchema.safeParse(value);
    if (!input.success) throw new WeatherError("WEATHER_INVALID");
    const latitude = Math.round(input.data.latitude * 1000) / 1000,
      longitude = Math.round(input.data.longitude * 1000) / 1000;
    const key = `forecast:${latitude}:${longitude}`;
    return this.shared(key, async () => {
      const saved = await this.cache.get(key);
      const valid = saved ? weatherForecastSchema.safeParse(saved.value) : null;
      const cached = valid?.success ? { ...saved!, value: valid.data } : null;
      if (
        cached &&
        !cached.value.points.some(p => Date.parse(p.time) > this.clock()) &&
        (cached.expiresAt > this.clock() ||
          (cached.retryAfter ?? 0) > this.clock())
      )
        throw new WeatherError("WEATHER_UNAVAILABLE");
      if (cached && cached.expiresAt > this.clock())
        return {
          ...cached.value,
          stale:
            this.clock() - Date.parse(cached.value.issuedAt) > 12 * 3600000,
        };
      if (
        cached?.retryAfter &&
        cached.retryAfter > this.clock() &&
        this.clock() - cached.fetchedAt < 86400000
      )
        return { ...cached.value, stale: true };
      try {
        const url = new URL(
          "https://api.met.no/weatherapi/locationforecast/2.0/compact"
        );
        url.search = new URLSearchParams({
          lat: String(latitude),
          lon: String(longitude),
        }).toString();
        const { response, data } = await this.request(
          url.toString(),
          cached?.lastModified
            ? { "If-Modified-Since": cached.lastModified }
            : {}
        );
        let forecast: WeatherForecast;
        if (response.status === 304) {
          if (!cached) throw new WeatherError("WEATHER_UNAVAILABLE");
          forecast = cached.value;
        } else
          forecast = normalizeWeather(data, latitude, longitude, this.clock());
        if (!forecast.points.some(p => Date.parse(p.time) > this.clock()))
          throw new WeatherError("WEATHER_UNAVAILABLE");
        const expires = Date.parse(response.headers.get("expires") || "");
        const entry: WeatherCacheEntry = {
          value: forecast,
          fetchedAt: this.clock(),
          expiresAt: Math.max(
            this.clock() + 3 * 3600000,
            Number.isFinite(expires) ? expires : 0
          ),
          lastModified:
            response.headers.get("last-modified") || cached?.lastModified,
        };
        await this.cache.put(key, entry);
        return {
          ...forecast,
          stale: this.clock() - Date.parse(forecast.issuedAt) > 12 * 3600000,
        };
      } catch (e) {
        if (
          cached &&
          this.clock() - cached.fetchedAt < 86400000 &&
          cached.value.points.some(p => Date.parse(p.time) > this.clock())
        ) {
          await this.cache.put(key, {
            ...cached,
            retryAfter: this.clock() + 300000,
          });
          return { ...cached.value, stale: true };
        }
        throw e;
      }
    });
  }
}
