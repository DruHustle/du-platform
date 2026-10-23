import interestCopy from "./tripInterestCopy.json";
import { tripText } from "./tripPlanCopy";
import { z } from "./validation";

const text = z.string().max(20000);
const cost = z.number().finite().nonnegative().max(10_000_000);
// Validate service responses before rendering nested fields or exporting a PDF.
export const tripPlanSchema = z.object({
  summary: text.min(1),
  optimizedFor: text.min(1),
  estimatedTotalUsd: cost,
  contingencyUsd: cost.optional(),
  nights: z.number().int().nonnegative().optional(),
  flights: z.object({
    route: text,
    cabin: text,
    estimatedCostUsd: cost,
    rationale: text,
  }),
  hotels: z.object({
    area: text,
    style: text,
    estimatedCostUsd: cost,
    rationale: text,
  }),
  carHire: z.object({
    vehicleClass: text,
    estimatedCostUsd: cost,
    rationale: text,
  }),
  experiences: z
    .array(
      z.object({
        name: text,
        location: text,
        estimatedCostUsd: cost,
        rationale: text,
      })
    )
    .max(60),
  itinerary: z
    .array(
      z.object({
        day: z.number().int().positive(),
        date: z.string().optional(),
        location: z.string().optional(),
        transferFrom: z.string().optional(),
        title: text,
        details: text,
        estimatedDailyCostUsd: cost,
      })
    )
    .min(1)
    .max(60),
});
export type PlanResult = z.infer<typeof tripPlanSchema>;

export type TripPlanningInput = {
  language: string;
  departureAirport: string;
  arrivalAirport: string;
  arrivalAttraction: string;
  comfort: string;
  budget: string;
  days: number;
  travelers: number;
  startDate?: string;
  endDate?: string;
  multiCity?: boolean;
  multiCityCities?: string[];
  interests?: string[];
  tripType?: string;
};
const labels: Record<
  string,
  { local: string; transfer: string; sample: string; assumptions: string }
> = {
  en: {
    assumptions:
      "Same sample rate per traveller; no child discounts assumed. Daily figures spread the full budget, including flights and contingency.",
    local: "Local research / free time",
    transfer:
      "Transfer allowance; confirm route, duration and transport with a local provider",
    sample:
      "Sample allowances only; no live prices or bookings. Accommodation nights: ",
  },
  de: {
    assumptions:
      "Gleiche Beispielbeträge pro Person; keine Kinderrabatte angenommen. Tagesbeträge verteilen das gesamte Budget einschließlich Flügen und Reserve.",
    local: "Örtliche Erkundung / Freizeit",
    transfer:
      "Transferpauschale; Route, Dauer und Transport mit einem Anbieter bestätigen",
    sample:
      "Nur Beispielbudgets; keine Livepreise oder Buchungen. Übernachtungen: ",
  },
  sn: {
    assumptions:
      "Mari yemuenzaniso yakafanana pamufambi wese; hapana kuderedzwa kwevana kwakafungidzirwa. Mari yezuva inogovera bhajeti rose kusanganisira ndege nemari yekuchengetera.",
    local: "Kuongorora nzvimbo / nguva yekuzorora",
    transfer:
      "Mari yekufamba yekuronga; simbisa nzira, nguva nezvifambiso nemupi",
    sample:
      "Mari dzemuenzaniso chete; hadzisi mitengo yazvino kana kubhuka. Husiku hwepekugara: ",
  },
  nd: {
    assumptions:
      "Isilinganiso esifanayo kumhambi ngamunye; akucatshangwa isephulelo sabantwana. Imali yelanga yabelana yonke ibhajethi, lendiza lemali egciniweyo.",
    local: "Ukuhlola indawo / isikhathi sokuphumula",
    transfer:
      "Isilinganiso sokuhamba; qinisekisa indlela, isikhathi lezokuhamba lomhlinzeki",
    sample:
      "Izilinganiso zesibonelo kuphela; akusimitengo yamanje kumbe ukubhukha. Ubusuku bokulala: ",
  },
};
export function tripPlaces(p: TripPlanningInput) {
  return Array.from(
    new Set(
      [p.arrivalAttraction, ...(p.multiCity ? (p.multiCityCities ?? []) : [])]
        .map(v => v.trim())
        .filter(Boolean)
    )
  );
}
export function buildSampleTripPlan(p: TripPlanningInput): PlanResult {
  const lang = p.language.split("-")[0];
  const l = labels[lang] || labels.en;
  const text = (
    key: Parameters<typeof tripText>[1],
    values?: Record<string, string | number>
  ) => tripText(p.language, key, values);
  let days = Math.max(1, Math.min(60, Math.round(p.days)));
  for (const value of [
    p.startDate,
    p.tripType === "one_way" ? undefined : p.endDate,
  ]) {
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(new Date(value + "T00:00:00Z").getTime()) ||
        new Date(value + "T00:00:00Z").toISOString().slice(0, 10) !== value)
    )
      throw new Error("Invalid calendar date.");
  }
  if (
    p.startDate &&
    p.endDate &&
    p.tripType !== "one_way" &&
    p.endDate < p.startDate
  )
    throw new Error("End date precedes start date.");
  const start =
    p.startDate && /^\d{4}-\d{2}-\d{2}$/.test(p.startDate)
      ? new Date(p.startDate + "T00:00:00Z")
      : null;
  if (start && p.endDate && p.tripType !== "one_way") {
    const end = new Date(p.endDate + "T00:00:00Z");
    const delta = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    if (delta > 60) throw new Error("Trip date range must not exceed 60 days.");
    if (delta > 0) days = delta;
  }
  const places = tripPlaces(p);
  if (places.length > Math.max(1, days - 2))
    throw new Error(
      "Allow at least one day per destination plus arrival and departure days."
    );
  const nights = Math.max(0, days - 1);
  const travelers = Math.max(1, Math.min(70, p.travelers));
  const budget = p.budget === "high" ? 1.35 : p.budget === "low" ? 0.85 : 1;
  const comfort =
    p.comfort === "premium" ? 1.4 : p.comfort === "budget" ? 0.8 : 1;
  const flights = Math.round(750 * budget * travelers),
    hotels = Math.round(120 * comfort * nights * travelers);
  // An explicit research allowance for each intercity leg, including return to arrival airport.
  const intercityLegs =
    places.length > 1 ? places.length - (p.tripType === "one_way" ? 1 : 0) : 0;
  const transport = Math.round(55 * comfort * days) + intercityLegs * 200;
  const activityAllowance = 70 * travelers;
  const itinerary = Array.from({ length: days }, (_, i) => {
    const last = i === days - 1 && p.tripType !== "one_way";
    const regionIndex = last
      ? 0
      : Math.min(
          places.length - 1,
          Math.floor(
            (Math.max(0, i - 1) * places.length) / Math.max(1, days - 2)
          )
        );
    return {
      day: i + 1,
      date: start
        ? new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10)
        : undefined,
      location: places[regionIndex],
      title: i === 0 ? text("arrival") : last ? text("departure") : l.local,
      details:
        i === 0
          ? text("arrival_client", {
              airport: p.arrivalAirport,
              place: p.arrivalAttraction,
            })
          : last
            ? text("return")
            : text("research_client"),
      estimatedDailyCostUsd: 0,
    };
  });
  const experiences: PlanResult["experiences"] = [];
  const interestLabels = (interestCopy as any)[lang] || interestCopy.en;
  const themes = (p.interests?.length ? p.interests : ["nature"]).filter(
    tag => typeof interestLabels[tag] === "string"
  );
  itinerary.forEach((day, i) => {
    const previous = itinerary[i - 1];
    if (previous && previous.location !== day.location) {
      Object.assign(day, { transferFrom: previous.location });
      day.title = `${previous.location} → ${day.location}`;
      day.details = l.transfer;
    }
    // Each priced activity is scheduled once. Remaining days carry no repeated activity charge.
    const theme = themes.find(
      tag =>
        !experiences.some(
          e =>
            e.location === day.location &&
            e.name === `${interestLabels[tag]} · ${day.location}`
        )
    );
    if (i > 0 && i < days - 1 && !("transferFrom" in day) && theme) {
      const name = `${interestLabels[theme]} · ${day.location}`;
      day.title = name;
      experiences.push({
        name,
        location: day.location!,
        estimatedCostUsd: activityAllowance,
        rationale: `${text("activity_client")} (USD 70 × ${travelers})`,
      });
    }
  });
  const subtotal =
    flights +
    hotels +
    transport +
    experiences.reduce((n, e) => n + e.estimatedCostUsd, 0);
  const contingency = Math.round(subtotal * 0.12),
    total = subtotal + contingency;
  itinerary.forEach((d, i) => {
    d.estimatedDailyCostUsd =
      Math.floor(total / days) + (i < total % days ? 1 : 0);
  });
  return {
    summary: text("summary_client", {
      days,
      place: places.join(" → "),
      budget: text(
        p.budget === "high" ? "high" : p.budget === "low" ? "low" : "medium"
      ),
      comfort: text(
        p.comfort === "premium"
          ? "premium"
          : p.comfort === "budget"
            ? "budget"
            : "standard"
      ),
    }),
    optimizedFor: l.sample + nights + ". " + l.assumptions,
    estimatedTotalUsd: total,
    contingencyUsd: contingency,
    nights,
    flights: {
      route: `${p.departureAirport} → ${p.arrivalAirport}`,
      cabin: text(p.comfort === "premium" ? "premium_cabin" : "economy_cabin"),
      estimatedCostUsd: flights,
      rationale: text("flight_client"),
    },
    hotels: {
      area: places.join(" / "),
      style: text(
        p.comfort === "premium"
          ? "premium_stay"
          : p.comfort === "budget"
            ? "budget_stay"
            : "standard_stay"
      ),
      estimatedCostUsd: hotels,
      rationale: text("hotel_client"),
    },
    carHire: {
      vehicleClass: text("standard_suv"),
      estimatedCostUsd: transport,
      rationale: `${text("car")} (${intercityLegs} × USD 200)`,
    },
    experiences,
    itinerary,
  };
}
export function validateTripPlan(
  raw: unknown,
  input: TripPlanningInput
): PlanResult | null {
  const parsed = tripPlanSchema.safeParse(raw);
  if (!parsed.success) return null;
  const p = parsed.data;
  const sample = buildSampleTripPlan(input);
  const places = tripPlaces(input);
  const costs =
    p.flights.estimatedCostUsd +
    p.hotels.estimatedCostUsd +
    p.carHire.estimatedCostUsd +
    p.experiences.reduce((n, e) => n + e.estimatedCostUsd, 0) +
    (p.contingencyUsd ?? 0);
  if (
    Math.abs(costs - p.estimatedTotalUsd) > 0.01 ||
    p.itinerary.length !== sample.itinerary.length ||
    p.nights !== sample.nights
  )
    return null;
  if (
    Math.abs(
      p.itinerary.reduce((n, d) => n + d.estimatedDailyCostUsd, 0) -
        p.estimatedTotalUsd
    ) > 0.01
  )
    return null;
  if (p.flights.route !== sample.flights.route) return null;
  if (p.experiences.some(e => !places.includes(e.location))) return null;
  if (
    p.experiences.some(
      e =>
        e.estimatedCostUsd > 0 &&
        p.itinerary.filter(
          d =>
            d.location === e.location &&
            `${d.title} ${d.details}`
              .toLowerCase()
              .includes(e.name.toLowerCase())
        ).length > 1
    )
  )
    return null;
  const prose = [
    p.hotels.area,
    ...p.itinerary.map(d => `${d.title} ${d.details}`),
  ]
    .join(" ")
    .toLowerCase();
  for (const place of [
    "Victoria Falls",
    "Hwange",
    "Harare",
    "Bulawayo",
    "Nyanga",
    "Mana Pools",
    "Kariba",
    "Gonarezhou",
  ]) {
    if (
      prose.includes(place.toLowerCase()) &&
      !places.some(p => p.toLowerCase().includes(place.toLowerCase()))
    )
      return null;
  }
  if (
    p.itinerary.some(
      (d, i) =>
        d.day !== i + 1 ||
        d.date !== sample.itinerary[i].date ||
        !d.location ||
        !places.includes(d.location) ||
        (i > 0 &&
          d.location !== p.itinerary[i - 1].location &&
          d.transferFrom !== p.itinerary[i - 1].location)
    )
  )
    return null;
  // Arrival/departure airport stays local and each selected region is represented.
  if (
    p.itinerary[0].location !== places[0] ||
    p.itinerary.at(-1)?.location !==
      (input.tripType === "one_way" ? places.at(-1) : places[0]) ||
    places.some(place => !p.itinerary.some(d => d.location === place))
  )
    return null;
  return p;
}
