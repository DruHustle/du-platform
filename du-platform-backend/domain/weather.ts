import { z } from "./validation";
export const weatherCoordinateSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();
export const weatherPlaceSchema = weatherCoordinateSchema.safeExtend({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(250),
  country: z.string().max(100),
  timezone: z.string().min(1).max(100),
});
export type WeatherPlace = z.infer<typeof weatherPlaceSchema>;
export const weatherConditions = [
  "clear",
  "fair",
  "partlycloudy",
  "cloudy",
  "fog",
  "rain",
  "snow",
  "sleet",
  "thunder",
  "unknown",
] as const;
export const weatherPointSchema = z.object({
  time: z.string().datetime(),
  temperature: z.number().min(-100).max(70),
  humidity: z.number().min(0).max(100).nullable(),
  windKmh: z.number().min(0).max(500).nullable(),
  precipitationMm: z.number().min(0).max(2000).nullable(),
  intervalHours: z
    .union([z.literal(1), z.literal(6), z.literal(12)])
    .nullable(),
  condition: z.enum(weatherConditions),
  night: z.boolean(),
});
export type WeatherPoint = z.infer<typeof weatherPointSchema>;
export const weatherForecastSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
  issuedAt: z.string().datetime(),
  fetchedAt: z.string().datetime(),
  stale: z.boolean(),
  points: z.array(weatherPointSchema).min(1).max(300),
});
export type WeatherForecast = z.infer<typeof weatherForecastSchema>;
