import { describe, expect, it } from "vitest";
import { weatherDays, type WeatherForecast } from "./weather";

describe("weather presentation", () => {
  it("groups observations by the destination date across the date line", () => {
    const point = { humidity: null, windKmh: null, precipitationMm: null, intervalHours: null, condition: "clear" as const, night: false };
    const forecast: WeatherForecast = { latitude: -36.85, longitude: 174.764, timezone: "Pacific/Auckland", issuedAt: "2026-10-27T10:00:00Z", fetchedAt: "2026-10-27T10:00:00Z", stale: false, points: [
      { ...point, time: "2026-10-27T12:00:00Z", temperature: 20 },
      { ...point, time: "2026-10-27T18:00:00Z", temperature: 27 },
    ] };
    expect(weatherDays(forecast, Date.parse("2026-10-27T10:00:00Z"))[0]).toMatchObject({ date: "2026-10-28", low: 20, high: 27 });
  });
});
