import type express from "express";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type TripPlanPayload = {
  origin: string;
  arrivalCity: string;
  departureAirport: string;
  arrivalAirport: string;
  arrivalAttraction: string;
  startDate: string;
  endDate: string;
  multiCity: boolean;
  multiCityCities: string[];
  season: "dry" | "green" | "shoulder";
  budget: "low" | "medium" | "high";
  comfort: "budget" | "standard" | "premium";
  days: number;
  travelers: number;
  interests: string[];
};

const AIRPORT_BY_CITY: Record<string, { label: string; iata: string }> = {
  berlin: { label: "Berlin Brandenburg Airport", iata: "BER" },
  frankfurt: { label: "Frankfurt Airport", iata: "FRA" },
  munich: { label: "Munich Airport", iata: "MUC" },
  london: { label: "London Heathrow Airport", iata: "LHR" },
  manchester: { label: "Manchester Airport", iata: "MAN" },
  birmingham: { label: "Birmingham Airport", iata: "BHX" },
  edinburgh: { label: "Edinburgh Airport", iata: "EDI" },
  glasgow: { label: "Glasgow Airport", iata: "GLA" },
  paris: { label: "Paris Charles de Gaulle Airport", iata: "CDG" },
  amsterdam: { label: "Amsterdam Schiphol Airport", iata: "AMS" },
  brussels: { label: "Brussels Airport", iata: "BRU" },
  madrid: { label: "Adolfo Suarez Madrid-Barajas Airport", iata: "MAD" },
  barcelona: { label: "Barcelona-El Prat Airport", iata: "BCN" },
  rome: { label: "Leonardo da Vinci-Fiumicino Airport", iata: "FCO" },
  milan: { label: "Milan Malpensa Airport", iata: "MXP" },
  lisbon: { label: "Humberto Delgado Airport", iata: "LIS" },
  vienna: { label: "Vienna International Airport", iata: "VIE" },
  zurich: { label: "Zurich Airport", iata: "ZRH" },
  johannesburg: { label: "O.R. Tambo International Airport", iata: "JNB" },
  "cape town": { label: "Cape Town International Airport", iata: "CPT" },
  durban: { label: "King Shaka International Airport", iata: "DUR" },
  gqeberha: { label: "Chief Dawid Stuurman International Airport", iata: "PLZ" },
  nairobi: { label: "Jomo Kenyatta International Airport", iata: "NBO" },
  harare: { label: "Robert Gabriel Mugabe International Airport", iata: "HRE" },
  bulawayo: { label: "Joshua Mqabuko Nkomo International Airport", iata: "BUQ" },
  "victoria falls": { label: "Victoria Falls International Airport", iata: "VFA" },
};

const ARRIVAL_AIRPORT_BY_ATTRACTION: Array<{ match: string[]; airport: string }> = [
  { match: ["victoria falls"], airport: "Victoria Falls International Airport (VFA)" },
  { match: ["hwange"], airport: "Victoria Falls International Airport (VFA)" },
  { match: ["matobo", "bulawayo"], airport: "Joshua Mqabuko Nkomo International Airport (BUQ)" },
  { match: ["great zimbabwe", "masvingo"], airport: "Joshua Mqabuko Nkomo International Airport (BUQ)" },
  { match: ["nyanga", "eastern highlands", "mutare"], airport: "Robert Gabriel Mugabe International Airport (HRE)" },
  { match: ["mana pools", "kariba"], airport: "Robert Gabriel Mugabe International Airport (HRE)" },
  { match: ["gonarezhou"], airport: "Robert Gabriel Mugabe International Airport (HRE)" },
  { match: ["harare"], airport: "Robert Gabriel Mugabe International Airport (HRE)" },
];

function inferDepartureAirport(originCity: string, providedDepartureAirport: string): string {
  if (providedDepartureAirport.trim().length > 0) return providedDepartureAirport.trim();
  const normalized = originCity.trim().toLowerCase();
  const hit = Object.entries(AIRPORT_BY_CITY).find(([city]) => normalized.includes(city));
  if (!hit) return `${originCity} Airport`;
  return `${hit[1].label} (${hit[1].iata})`;
}

function inferArrivalAirport(arrivalAttraction: string): string {
  const normalized = arrivalAttraction.trim().toLowerCase();
  const hit = ARRIVAL_AIRPORT_BY_ATTRACTION.find((candidate) =>
    candidate.match.some((token) => normalized.includes(token))
  );
  return hit?.airport ?? "Robert Gabriel Mugabe International Airport (HRE)";
}

function inferSeasonFromDate(startDate: string): "dry" | "green" | "shoulder" {
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) return "dry";
  const month = parsed.getUTCMonth() + 1;
  if (month >= 5 && month <= 10) return "dry";
  if (month === 4 || month === 11) return "shoulder";
  return "green";
}

type TripPlanResult = {
  summary: string;
  optimizedFor: string;
  estimatedTotalUsd: number;
  flights: {
    route: string;
    cabin: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  hotels: {
    area: string;
    style: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  carHire: {
    vehicleClass: string;
    estimatedCostUsd: number;
    rationale: string;
  };
  experiences: Array<{
    name: string;
    location: string;
    estimatedCostUsd: number;
    rationale: string;
  }>;
  itinerary: Array<{
    day: number;
    title: string;
    details: string;
    estimatedDailyCostUsd: number;
  }>;
};

type OnesaReplyResult = {
  reply: string;
  truncated: boolean;
};

export type OnesaRouteDeps = {
  generateOnesaReply: (messages: ChatMessage[], requestedLanguage?: string) => Promise<OnesaReplyResult>;
  normalizeOnesaLanguage: (value: unknown) => "en" | "sn" | "nd" | "de";
  enforceOnesaIdentityGuard: (reply: string, language: "en" | "sn" | "nd" | "de") => string;
  getOnesaHealth: () => Promise<any>;
  getOnesaReadiness: () => Promise<any>;
  getUpstreamStatus: (error: any) => number;
  getRetryAfterMs: (error: any) => number | null;
  getGlobalBackoffRemainingMs: () => number;
  isRateLimitedUpstreamError: (error: any) => boolean;
  onChatSuccess: () => void;
};

type RouteRegistrationOptions = {
  prefix?: string;
  worldPath?: string;
};

type GeneratedWorldPayload = {
  modelUrl?: string;
  primitive?: {
    kind: "box" | "sphere" | "icosahedron" | "torus";
    color: string;
    scale: [number, number, number];
  };
  title?: string;
  hint?: string;
};

function normalizeTripPlanPayload(raw: any): TripPlanPayload {
  const toText = (value: unknown, fallback: string) => {
    const text = String(value ?? "").trim();
    return text.length > 0 ? text.slice(0, 120) : fallback;
  };
  const toEnum = <T extends string>(value: unknown, allowed: T[], fallback: T): T => {
    const text = String(value ?? "").trim().toLowerCase() as T;
    return allowed.includes(text) ? text : fallback;
  };
  const toInt = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  };

  const interestsRaw = Array.isArray(raw?.interests) ? raw.interests : [];
  const interestWhitelist = new Set(["wildlife", "culture", "adventure", "food", "history", "nature"]);
  const interests = interestsRaw
    .map((value: unknown) => String(value ?? "").trim().toLowerCase())
    .filter((value: string) => interestWhitelist.has(value))
    .slice(0, 6);
  const multiCityCitiesRaw = Array.isArray(raw?.multiCityCities) ? raw.multiCityCities : [];
  const multiCityCities = multiCityCitiesRaw
    .map((value: unknown) => String(value ?? "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const startDate = toText(raw?.startDate, "");
  const endDate = toText(raw?.endDate, "");
  const season = inferSeasonFromDate(startDate);

  const origin = toText(raw?.departureAirportCity ?? raw?.origin, "Berlin");
  const arrivalAttraction = toText(raw?.arrivalAttraction ?? raw?.arrivalCity, "Victoria Falls");
  const departureAirport = inferDepartureAirport(origin, toText(raw?.departureAirport, ""));
  const arrivalAirport = inferArrivalAirport(arrivalAttraction);

  return {
    origin,
    arrivalCity: arrivalAttraction,
    departureAirport,
    arrivalAirport,
    arrivalAttraction,
    startDate,
    endDate,
    multiCity: Boolean(raw?.multiCity),
    multiCityCities,
    season,
    budget: toEnum(raw?.budget, ["low", "medium", "high"], "medium"),
    comfort: toEnum(raw?.comfort, ["budget", "standard", "premium"], "standard"),
    days: toInt(raw?.days, 3, 14, 7),
    travelers: toInt(raw?.travelers, 1, 70, 2),
    interests: interests.length > 0 ? interests : ["wildlife", "culture"],
  };
}

function tryParseJsonObject(input: string): Record<string, any> | null {
  const text = String(input ?? "").trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const candidate = text.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : null;
    } catch {
      return null;
    }
  }
}

function buildFallbackTripPlan(payload: TripPlanPayload): TripPlanResult {
  const seasonMultiplier = payload.season === "dry" ? 1.2 : payload.season === "green" ? 0.9 : 1.0;
  const flightBaseByBudget: Record<TripPlanPayload["budget"], number> = { low: 620, medium: 910, high: 1380 };
  const hotelNightByComfort: Record<TripPlanPayload["comfort"], number> = { budget: 85, standard: 150, premium: 260 };
  const carDayByComfort: Record<TripPlanPayload["comfort"], number> = { budget: 42, standard: 65, premium: 110 };

  const experiencesCatalog = [
    { tag: "wildlife", name: "Hwange Guided Safari", location: "Hwange", cost: 120 },
    { tag: "culture", name: "Mbare Cultural Food Walk", location: "Harare", cost: 45 },
    { tag: "adventure", name: "Zambezi Whitewater Rafting", location: "Victoria Falls", cost: 145 },
    { tag: "history", name: "Great Zimbabwe Guided Tour", location: "Masvingo", cost: 60 },
    { tag: "nature", name: "Eastern Highlands Hike", location: "Nyanga", cost: 55 },
    { tag: "food", name: "Harare Local Dining Circuit", location: "Harare", cost: 50 },
  ];

  const selectedExperiences = experiencesCatalog
    .filter((item) => payload.interests.includes(item.tag))
    .slice(0, Math.min(4, payload.days));
  const fallbackExperiences = selectedExperiences.length > 0 ? selectedExperiences : experiencesCatalog.slice(0, 3);

  const flightsCost = Math.round(flightBaseByBudget[payload.budget] * seasonMultiplier * payload.travelers);
  const hotelsCost = Math.round(hotelNightByComfort[payload.comfort] * payload.days * payload.travelers);
  const carCost = Math.round(carDayByComfort[payload.comfort] * payload.days);
  const experiencesCost = fallbackExperiences.reduce((sum, item) => sum + item.cost * payload.travelers, 0);
  const buffer = Math.round((flightsCost + hotelsCost + carCost + experiencesCost) * 0.12);
  const total = flightsCost + hotelsCost + carCost + experiencesCost + buffer;

  const itinerary = Array.from({ length: payload.days }, (_unused, idx) => {
    const day = idx + 1;
    const exp = fallbackExperiences[idx % fallbackExperiences.length];
    const transferCost = day === 1 || day === payload.days ? 60 : 35;
    const dayCost = Math.round(exp.cost * payload.travelers + hotelNightByComfort[payload.comfort] * payload.travelers + transferCost);
    return {
      day,
      title:
        day === 1
          ? `Arrival for ${payload.arrivalAttraction}`
          : day === payload.days
            ? "Departure Day"
            : exp.name,
      details:
        day === 1
          ? `Arrive from ${payload.departureAirport} to ${payload.arrivalAirport}, then transfer to ${payload.arrivalAttraction} area and settle in with a light orientation walk.`
          : day === payload.days
            ? "Final breakfast, optional short activity, and airport transfer."
            : `Focus on ${exp.name} in ${exp.location}, with timing optimized for ${payload.season} season conditions.`,
      estimatedDailyCostUsd: dayCost,
    };
  });

  return {
    summary: `A ${payload.days}-day Zimbabwe itinerary for ${payload.arrivalAttraction} from ${payload.startDate || "your selected dates"} to ${payload.endDate || "return date"}, tuned for ${payload.season} season with ${payload.comfort} comfort and ${payload.budget} budget priorities.`,
    optimizedFor: "Balanced between seasonal value, comfort level, and total trip cost.",
    estimatedTotalUsd: total,
    flights: {
      route: `${payload.departureAirport} → ${payload.arrivalAirport}${payload.multiCity && payload.multiCityCities.length > 0 ? ` (${payload.multiCityCities.join(" • ")})` : ""}`,
      cabin: payload.comfort === "premium" ? "Business + flexible fares" : payload.comfort === "standard" ? "Economy Flex" : "Economy Saver",
      estimatedCostUsd: flightsCost,
      rationale: "Flight estimate includes seasonal fare multiplier and passenger count.",
    },
    hotels: {
      area:
        payload.multiCity && payload.multiCityCities.length > 0
          ? `${payload.arrivalCity} + ${payload.multiCityCities.join(" + ")}`
          : payload.interests.includes("wildlife")
            ? "Victoria Falls + Hwange corridor"
            : `${payload.arrivalCity} + destination hubs`,
      style: payload.comfort === "premium" ? "4-5 star mix" : payload.comfort === "standard" ? "3-4 star mix" : "2-3 star value lodges",
      estimatedCostUsd: hotelsCost,
      rationale: "Hotel budget calculated per night, per traveler, aligned to comfort profile.",
    },
    carHire: {
      vehicleClass: payload.comfort === "premium" ? "Premium SUV" : payload.comfort === "standard" ? "Standard SUV" : "Compact crossover",
      estimatedCostUsd: carCost,
      rationale: "Daily rental estimate includes route flexibility for major tourism corridors.",
    },
    experiences: fallbackExperiences.map((item) => ({
      name: item.name,
      location: item.location,
      estimatedCostUsd: Math.round(item.cost * payload.travelers),
      rationale: "Selected from your interest profile and seasonal suitability.",
    })),
    itinerary,
  };
}

function coerceTripPlanFromAiPayload(raw: Record<string, any>, fallback: TripPlanResult): TripPlanResult | null {
  const summary = typeof raw?.summary === "string" ? raw.summary.trim() : "";
  const optimizedFor = typeof raw?.optimizedFor === "string" ? raw.optimizedFor.trim() : "";
  const estimatedTotalUsd = Number(raw?.estimatedTotalUsd);
  const flights = raw?.flights;
  const hotels = raw?.hotels;
  const carHire = raw?.carHire;
  const experiences = Array.isArray(raw?.experiences) ? raw.experiences : [];
  const itinerary = Array.isArray(raw?.itinerary) ? raw.itinerary : [];
  if (!summary || !optimizedFor || !Number.isFinite(estimatedTotalUsd)) return null;
  if (!flights || !hotels || !carHire || experiences.length === 0 || itinerary.length === 0) return null;

  return {
    summary,
    optimizedFor,
    estimatedTotalUsd: Math.max(0, Math.round(estimatedTotalUsd)),
    flights: {
      route: typeof flights.route === "string" ? flights.route : fallback.flights.route,
      cabin: typeof flights.cabin === "string" ? flights.cabin : fallback.flights.cabin,
      estimatedCostUsd: Math.max(0, Math.round(Number(flights.estimatedCostUsd) || fallback.flights.estimatedCostUsd)),
      rationale: typeof flights.rationale === "string" ? flights.rationale : fallback.flights.rationale,
    },
    hotels: {
      area: typeof hotels.area === "string" ? hotels.area : fallback.hotels.area,
      style: typeof hotels.style === "string" ? hotels.style : fallback.hotels.style,
      estimatedCostUsd: Math.max(0, Math.round(Number(hotels.estimatedCostUsd) || fallback.hotels.estimatedCostUsd)),
      rationale: typeof hotels.rationale === "string" ? hotels.rationale : fallback.hotels.rationale,
    },
    carHire: {
      vehicleClass: typeof carHire.vehicleClass === "string" ? carHire.vehicleClass : fallback.carHire.vehicleClass,
      estimatedCostUsd: Math.max(0, Math.round(Number(carHire.estimatedCostUsd) || fallback.carHire.estimatedCostUsd)),
      rationale: typeof carHire.rationale === "string" ? carHire.rationale : fallback.carHire.rationale,
    },
    experiences: experiences.slice(0, 6).map((item: any, idx: number) => ({
      name: typeof item?.name === "string" ? item.name : fallback.experiences[idx % fallback.experiences.length].name,
      location:
        typeof item?.location === "string"
          ? item.location
          : fallback.experiences[idx % fallback.experiences.length].location,
      estimatedCostUsd: Math.max(
        0,
        Math.round(Number(item?.estimatedCostUsd) || fallback.experiences[idx % fallback.experiences.length].estimatedCostUsd)
      ),
      rationale:
        typeof item?.rationale === "string"
          ? item.rationale
          : fallback.experiences[idx % fallback.experiences.length].rationale,
    })),
    itinerary: itinerary.slice(0, 14).map((item: any, idx: number) => ({
      day: Math.max(1, Math.round(Number(item?.day) || idx + 1)),
      title: typeof item?.title === "string" ? item.title : fallback.itinerary[idx % fallback.itinerary.length].title,
      details:
        typeof item?.details === "string"
          ? item.details
          : fallback.itinerary[idx % fallback.itinerary.length].details,
      estimatedDailyCostUsd: Math.max(
        0,
        Math.round(Number(item?.estimatedDailyCostUsd) || fallback.itinerary[idx % fallback.itinerary.length].estimatedDailyCostUsd)
      ),
    })),
  };
}

function normalizeMountedPath(prefix: string, path: string): string {
  const normalizedPrefix = String(prefix ?? "").trim().replace(/\/+$/, "");
  const normalizedPath = String(path ?? "").trim();
  if (!normalizedPrefix) {
    return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
  }

  if (!normalizedPath) return normalizedPrefix;
  return `${normalizedPrefix}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

export function registerOnesaAIRoutes(
  app: {
    get: (...args: any[]) => unknown;
    post: (...args: any[]) => unknown;
  },
  deps: OnesaRouteDeps,
  options: RouteRegistrationOptions = {}
) {
  const prefix = normalizeMountedPath(options.prefix ?? "/api/ai", "");
  const worldPath = normalizeMountedPath(prefix, options.worldPath ?? "/generate-world");
  const chatPath = normalizeMountedPath(prefix, "/chat");
  const tripPlanPath = normalizeMountedPath(prefix, "/trip-plan");
  const healthPath = normalizeMountedPath(prefix, "/health");
  const readyPath = normalizeMountedPath(prefix, "/ready");

  app.post(worldPath, async (req: express.Request, res: express.Response) => {
    const prompt = String(req.body?.prompt ?? "").trim();
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required." });
    }

    const fallbackFromPrompt = (): GeneratedWorldPayload => {
      const text = prompt.toLowerCase();
      if (text.includes("crystal")) {
        return {
          primitive: { kind: "icosahedron", color: "#67e8f9", scale: [1.4, 1.4, 1.4] },
          title: "AI Crystal",
          hint: "Rotating crystal generated from prompt.",
        };
      }
      if (text.includes("drone")) {
        return {
          primitive: { kind: "torus", color: "#f97316", scale: [1.7, 0.6, 1.7] },
          title: "AI Drone Marker",
          hint: "Futuristic ring-drone proxy generated from prompt.",
        };
      }
      if (text.includes("planet") || text.includes("sphere")) {
        return {
          primitive: { kind: "sphere", color: "#60a5fa", scale: [1.6, 1.6, 1.6] },
          title: "AI Sphere",
          hint: "Planet-style object generated from prompt.",
        };
      }
      return {
        primitive: { kind: "box", color: "#d4af37", scale: [1.3, 1.3, 1.3] },
        title: "AI Object",
        hint: "Generated object is using a geometric fallback.",
      };
    };

    try {
      const aiPrompt = [
        "You are a world-building assistant for WebXR.",
        "Given the user prompt, return ONLY valid JSON.",
        "Schema:",
        '{"modelUrl":string|null,"primitive":{"kind":"box|sphere|icosahedron|torus","color":"#RRGGBB","scale":[number,number,number]},"title":string,"hint":string}',
        "If no direct 3D model URL is available, set modelUrl to null and provide a primitive.",
        `User prompt: ${prompt}`,
      ].join("\n");

      const result = await deps.generateOnesaReply([{ role: "user", content: aiPrompt }], "en");
      const raw = String(result.reply ?? "").trim();
      const parsed = (() => {
        try {
          return JSON.parse(raw);
        } catch {
          const start = raw.indexOf("{");
          const end = raw.lastIndexOf("}");
          if (start < 0 || end <= start) return null;
          try {
            return JSON.parse(raw.slice(start, end + 1));
          } catch {
            return null;
          }
        }
      })() as GeneratedWorldPayload | null;

      if (parsed && (parsed.modelUrl || parsed.primitive)) {
        return res.json(parsed);
      }
      return res.json(fallbackFromPrompt());
    } catch {
      return res.json(fallbackFromPrompt());
    }
  });

  app.post(chatPath, async (req: express.Request, res: express.Response) => {
    try {
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const requestedLanguage = typeof req.body?.language === "string" ? req.body.language : undefined;
      const messages: ChatMessage[] = rawMessages
        .map((m: any) => ({
          role: m?.role,
          content: typeof m?.content === "string" ? m.content.trim() : "",
        }))
        .filter((m: ChatMessage) => (m.role === "user" || m.role === "assistant" || m.role === "system") && m.content.length > 0)
        .slice(-20);

      if (messages.length === 0) {
        return res.status(400).json({ message: "At least one user message is required." });
      }

      const result = await deps.generateOnesaReply(messages, requestedLanguage);
      if (!result?.reply) {
        return res.status(502).json({ message: "Onesa model returned an empty response." });
      }
      const guardLanguage = deps.normalizeOnesaLanguage(requestedLanguage ?? "");
      const safeReply = deps.enforceOnesaIdentityGuard(result.reply, guardLanguage);
      deps.onChatSuccess();
      return res.json({ reply: safeReply, truncated: Boolean(result.truncated) });
    } catch (error: any) {
      const upstreamStatus = deps.getUpstreamStatus(error);
      const retryAfterMs = deps.getRetryAfterMs(error) ?? deps.getGlobalBackoffRemainingMs();
      if (upstreamStatus === 429 || deps.isRateLimitedUpstreamError(error)) {
        return res.status(429).json({
          message: "Onesa is receiving too many requests right now. Please try again shortly.",
          retryAfterMs: retryAfterMs > 0 ? retryAfterMs : undefined,
        });
      }
      if (upstreamStatus === 503 || upstreamStatus === 504) {
        return res.status(503).json({ message: "Onesa provider is temporarily unavailable. Please try again shortly." });
      }
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        return res.status(503).json({ message: "Onesa provider is temporarily unavailable. Please try again shortly." });
      }
      const upstream = String(error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? "").trim();
      console.error("[onesa/chat] request failed", { upstreamStatus, upstream });
      return res.status(500).json({ message: "Onesa chat request failed." });
    }
  });

  app.post(tripPlanPath, async (req: express.Request, res: express.Response) => {
    const payload = normalizeTripPlanPayload(req.body ?? {});
    const requestedLanguage = typeof req.body?.language === "string" ? req.body.language : "en";
    const fallbackPlan = buildFallbackTripPlan(payload);

    try {
      const readiness = await deps.getOnesaReadiness();
      if (!readiness?.ready) {
        return res.json({ source: "fallback", plan: fallbackPlan });
      }

      const tripPrompt = [
        "Create a Zimbabwe travel plan optimized for season, cost, and comfort.",
        "Return ONLY valid JSON without markdown fences.",
        "JSON keys required:",
        "summary, optimizedFor, estimatedTotalUsd, flights, hotels, carHire, experiences, itinerary.",
        "flights keys: route, cabin, estimatedCostUsd, rationale.",
        "hotels keys: area, style, estimatedCostUsd, rationale.",
        "carHire keys: vehicleClass, estimatedCostUsd, rationale.",
        "experiences: array of objects with name, location, estimatedCostUsd, rationale.",
        "itinerary: array with one entry per day and keys day, title, details, estimatedDailyCostUsd.",
        "All prices in USD as numbers only.",
      ].join(" ");

      const userContext = `Trip preferences: ${JSON.stringify(payload)}`;
      const aiResult = await deps.generateOnesaReply(
        [
          { role: "system", content: tripPrompt },
          { role: "user", content: userContext },
        ],
        requestedLanguage
      );

      const parsed = tryParseJsonObject(aiResult.reply ?? "");
      if (!parsed) return res.json({ source: "fallback", plan: fallbackPlan });

      const normalized = coerceTripPlanFromAiPayload(parsed, fallbackPlan);
      if (!normalized) return res.json({ source: "fallback", plan: fallbackPlan });

      return res.json({ source: "ai", plan: normalized });
    } catch (error: any) {
      const upstreamStatus = deps.getUpstreamStatus(error);
      console.error("[onesa/trip-plan] generation failed", {
        upstreamStatus,
        message: String(error?.message ?? error),
      });
      return res.json({ source: "fallback", plan: fallbackPlan });
    }
  });

  app.get(healthPath, async (_req: express.Request, res: express.Response) => {
    const health = await deps.getOnesaHealth();
    const status = health.ok ? 200 : 503;
    return res.status(status).json(health);
  });

  app.get(readyPath, async (_req: express.Request, res: express.Response) => {
    const readiness = await deps.getOnesaReadiness();
    const status = readiness.ready ? 200 : 503;
    return res.status(status).json(readiness);
  });
}
