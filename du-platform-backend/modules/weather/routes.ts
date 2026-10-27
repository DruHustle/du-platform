import { Router } from "express";
import { z } from "../../../shared/validation";
import { weatherCoordinateSchema } from "../../../shared/weather";
import { db } from "../../shared/databaseRuntime";
import { rateLimiter } from "../../core/rateLimiter";
import { ok, error } from "../../shared/responseFormatter";
import { MemoryWeatherCache, SqlWeatherCache } from "./cache";
import { WeatherProvider, WeatherError } from "./provider";
export function createWeatherRouter(
  provider = new WeatherProvider(
    db ? new SqlWeatherCache(db) : new MemoryWeatherCache(),
    fetch,
    Date.now,
    process.env.WEATHER_GEOCODER_URL || undefined
  )
) {
  const router = Router();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.use(
    rateLimiter({
      keyPrefix: "weather:minute",
      windowMs: 60000,
      maxRequests: 15,
    }),
    rateLimiter({
      keyPrefix: "weather:day",
      windowMs: 86400000,
      maxRequests: 150,
    })
  );
  const search = z
    .object({ query: z.string().trim().min(2).max(100) })
    .strict();
  for (const action of ["places", "forecast"] as const)
    router.post(`/${action}`, async (req, res) => {
      try {
        const parsed = (
          action === "places" ? search : weatherCoordinateSchema
        ).safeParse(req.body);
        if (!parsed.success) throw new WeatherError("WEATHER_INVALID");
        const data =
          action === "places"
            ? await provider.places((parsed.data as { query: string }).query)
            : await provider.forecast(parsed.data);
        res.json(ok(data));
      } catch (e) {
        const code = e instanceof WeatherError ? e.code : "WEATHER_UNAVAILABLE";
        const status =
          code === "WEATHER_INVALID"
            ? 400
            : code === "WEATHER_BUSY"
              ? 429
              : 503;
        if (status === 429) res.setHeader("Retry-After", "2");
        res
          .status(status)
          .json(
            error(
              code,
              "Weather information could not be loaded. Keep your selection and try again later."
            )
          );
      }
    });
  return router;
}
