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
export const weatherPresets = [
  {
    id: "harare",
    name: "Harare",
    latitude: -17.825,
    longitude: 31.033,
    country: "Zimbabwe",
    timezone: "Africa/Harare",
  },
  {
    id: "victoria-falls",
    name: "Victoria Falls",
    latitude: -17.924,
    longitude: 25.857,
    country: "Zimbabwe",
    timezone: "Africa/Harare",
  },
  {
    id: "bulawayo",
    name: "Bulawayo",
    latitude: -20.15,
    longitude: 28.583,
    country: "Zimbabwe",
    timezone: "Africa/Harare",
  },
  {
    id: "cape-town",
    name: "Cape Town",
    latitude: -33.925,
    longitude: 18.424,
    country: "South Africa",
    timezone: "Africa/Johannesburg",
  },
  {
    id: "johannesburg",
    name: "Johannesburg",
    latitude: -26.204,
    longitude: 28.047,
    country: "South Africa",
    timezone: "Africa/Johannesburg",
  },
] satisfies WeatherPlace[];
export function weatherDate(time: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(time));
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function weatherDays(forecast: WeatherForecast, now = Date.now()) {
  const days = new Map<string, WeatherPoint[]>();
  for (const point of forecast.points) {
    if (Date.parse(point.time) < now - 3600000) continue;
    const day = weatherDate(point.time, forecast.timezone);
    if (!days.has(day)) days.set(day, []);
    days.get(day)!.push(point);
  }
  return Array.from(days.entries())
    .slice(0, 7)
    .map(([date, points]) => ({
      date,
      points,
      low: Math.min(...points.map(p => p.temperature)),
      high: Math.max(...points.map(p => p.temperature)),
    }));
}
