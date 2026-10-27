import crypto from "node:crypto";
import mysql, { type Pool } from "mysql2/promise";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { initializeWeather, SqlWeatherCache } from "../cache";
import { WeatherProvider } from "../provider";
const url = process.env.SHOP_TEST_DATABASE_URL;
if (
  url &&
  (!new URL(url).pathname.endsWith("_test") ||
    !["127.0.0.1", "localhost"].includes(new URL(url).hostname))
)
  throw new Error(
    "Weather integration tests require disposable localhost *_test database"
  );
describe.skipIf(!url)("persistent public weather cache in MySQL", () => {
  let pool: Pool;
  const schema = `du_weather_${crypto.randomBytes(6).toString("hex")}_test`;
  beforeAll(async () => {
    const admin = mysql.createPool(url!);
    await admin.execute(`CREATE DATABASE ${schema}`);
    await admin.end();
    const target = new URL(url!);
    target.pathname = "/" + schema;
    pool = mysql.createPool({ uri: target.toString(), timezone: "Z" });
    await initializeWeather(pool);
  });
  afterAll(async () => {
    if (pool) {
      await pool.end();
      const admin = mysql.createPool(url!);
      await admin.execute(`DROP DATABASE IF EXISTS ${schema}`);
      await admin.end();
    }
  });
  it("survives cache/provider recreation and restart-safe schema initialization", async () => {
    const now = Date.now();
    const value = {
      latitude: -17.825,
      longitude: 31.033,
      timezone: "Africa/Harare",
      issuedAt: new Date(now).toISOString(),
      fetchedAt: new Date(now).toISOString(),
      stale: false,
      points: [
        {
          time: new Date(now + 3600000).toISOString(),
          temperature: 24,
          windKmh: 18,
          humidity: 70,
          precipitationMm: 0,
          intervalHours: 1,
          condition: "fair",
          night: false,
        },
      ],
    };
    await new SqlWeatherCache(pool).put("forecast:-17.825:31.033", {
      value,
      fetchedAt: now,
      expiresAt: now + 3 * 3600000,
      lastModified: new Date(now).toUTCString(),
    });
    await initializeWeather(pool);
    const upstream = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("Unexpected provider call"));
    const provider = new WeatherProvider(
      new SqlWeatherCache(pool),
      upstream,
      () => now + 60000
    );
    expect(
      (await provider.forecast({ latitude: -17.825, longitude: 31.033 }))
        .points[0].temperature
    ).toBe(24);
    expect(upstream).not.toHaveBeenCalled();
  });
  it("round-trips cache metadata and replaces data without extra rows", async () => {
    const cache = new SqlWeatherCache(pool),
      now = Date.now();
    await cache.put("places:fixture", {
      value: [],
      fetchedAt: now,
      expiresAt: now + 100000,
    });
    await cache.put("places:fixture", {
      value: [{ name: "Synthetic place" }],
      fetchedAt: now + 1,
      expiresAt: now + 200000,
      retryAfter: now + 1000,
    });
    expect(await cache.get("places:fixture")).toMatchObject({
      value: [{ name: "Synthetic place" }],
      retryAfter: now + 1000,
    });
    expect(await cache.get("places:missing")).toBeNull();
    const [rows] = await pool.query<any[]>(
      "SELECT COUNT(*) AS total FROM weather_cache WHERE cache_key='places:fixture'"
    );
    expect(Number(rows[0].total)).toBe(1);
  });
});
