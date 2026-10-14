import { FormEvent, useMemo, useRef, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestOnesaTripPlan } from "@/modules/ai/lib/aiApi";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Car,
  Download,
  Hotel,
  Plane,
  Sparkles,
  Wallet,
} from "lucide-react";

type PlanResult = {
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

type Interest =
  | "wildlife"
  | "culture"
  | "adventure"
  | "food"
  | "history"
  | "nature";
type TripType = "one_way" | "round_trip" | "multi_trip";
type DepartureOption = {
  value: string;
  city: string;
  airport: string;
  iata: string;
};
type AttractionOption = {
  value: string;
  label: string;
  nearestAirport: string;
};

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createSimplePdf(lines: string[]): Uint8Array {
  const safeLines = lines.slice(0, 250);
  const content = ["BT", "/F1 10 Tf", "50 780 Td", "14 TL"];
  safeLines.forEach((line, index) => {
    const text = escapePdfText(line);
    content.push(`(${text}) Tj`);
    if (index < safeLines.length - 1) content.push("T*");
  });
  content.push("ET");
  const stream = content.join("\n");

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach(obj => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });
  const xrefPosition = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

function buildClientFallbackPlan(params: {
  departureAirport: string;
  arrivalAttraction: string;
  arrivalAirport: string;
  comfort: string;
  budget: string;
  days: number;
  travelers: number;
}): PlanResult {
  const nights = Math.max(1, params.days);
  const budgetMult =
    params.budget === "high" ? 1.35 : params.budget === "low" ? 0.85 : 1;
  const comfortMult =
    params.comfort === "premium" ? 1.4 : params.comfort === "budget" ? 0.8 : 1;
  const flightsCost = Math.round(750 * budgetMult * params.travelers);
  const hotelsCost = Math.round(120 * comfortMult * nights * params.travelers);
  const carCost = Math.round(55 * comfortMult * nights);
  const experiencesCost = Math.round(
    70 * params.travelers * Math.min(4, nights)
  );
  const total = flightsCost + hotelsCost + carCost + experiencesCost;

  return {
    summary: `${nights}-day Zimbabwe plan around ${params.arrivalAttraction}, optimized for ${params.budget} budget and ${params.comfort} comfort.`,
    optimizedFor: "Balanced seasonal value, comfort, and total cost.",
    estimatedTotalUsd: total,
    flights: {
      route: `${params.departureAirport} -> ${params.arrivalAirport}`,
      cabin: params.comfort === "premium" ? "Business" : "Economy Flex",
      estimatedCostUsd: flightsCost,
      rationale: "Estimated from route, comfort profile, and traveler count.",
    },
    hotels: {
      area: `${params.arrivalAttraction} corridor`,
      style:
        params.comfort === "premium"
          ? "4-5 star mix"
          : params.comfort === "budget"
            ? "2-3 star lodges"
            : "3-4 star mix",
      estimatedCostUsd: hotelsCost,
      rationale: "Nightly stay estimate aligned with comfort preference.",
    },
    carHire: {
      vehicleClass:
        params.comfort === "premium" ? "Premium SUV" : "Standard SUV",
      estimatedCostUsd: carCost,
      rationale: "Daily local transport estimate for flexible routing.",
    },
    experiences: [
      {
        name: "Guided local highlights tour",
        location: params.arrivalAttraction,
        estimatedCostUsd: Math.round(90 * params.travelers),
        rationale:
          "Core orientation experience near your selected destination.",
      },
      {
        name: "Cultural and food experience",
        location: "Harare/Bulawayo hubs",
        estimatedCostUsd: Math.round(60 * params.travelers),
        rationale: "Local culture and cuisine aligned with visitor demand.",
      },
    ],
    itinerary: Array.from({ length: nights }, (_v, i) => ({
      day: i + 1,
      title:
        i === 0
          ? "Arrival and check-in"
          : i === nights - 1
            ? "Departure"
            : `Day ${i + 1} highlights`,
      details:
        i === 0
          ? `Arrive via ${params.arrivalAirport}, transfer to ${params.arrivalAttraction}, and settle in.`
          : i === nights - 1
            ? "Final activities and airport transfer."
            : "Guided experiences, local dining, and flexible exploration.",
      estimatedDailyCostUsd: Math.round(total / nights),
    })),
  };
}

export default function BookTripPage() {
  const { t, i18n } = useTranslation();
  const departureOptions: DepartureOption[] = [
    {
      value: "berlin",
      city: "Berlin",
      airport: "Berlin Brandenburg Airport",
      iata: "BER",
    },
    {
      value: "frankfurt",
      city: "Frankfurt",
      airport: "Frankfurt Airport",
      iata: "FRA",
    },
    { value: "munich", city: "Munich", airport: "Munich Airport", iata: "MUC" },
    {
      value: "london",
      city: "London",
      airport: "London Heathrow Airport",
      iata: "LHR",
    },
    {
      value: "manchester",
      city: "Manchester",
      airport: "Manchester Airport",
      iata: "MAN",
    },
    {
      value: "birmingham",
      city: "Birmingham",
      airport: "Birmingham Airport",
      iata: "BHX",
    },
    {
      value: "edinburgh",
      city: "Edinburgh",
      airport: "Edinburgh Airport",
      iata: "EDI",
    },
    {
      value: "glasgow",
      city: "Glasgow",
      airport: "Glasgow Airport",
      iata: "GLA",
    },
    {
      value: "paris",
      city: "Paris",
      airport: "Paris Charles de Gaulle Airport",
      iata: "CDG",
    },
    {
      value: "amsterdam",
      city: "Amsterdam",
      airport: "Amsterdam Schiphol Airport",
      iata: "AMS",
    },
    {
      value: "brussels",
      city: "Brussels",
      airport: "Brussels Airport",
      iata: "BRU",
    },
    {
      value: "madrid",
      city: "Madrid",
      airport: "Adolfo Suarez Madrid-Barajas Airport",
      iata: "MAD",
    },
    {
      value: "barcelona",
      city: "Barcelona",
      airport: "Barcelona-El Prat Airport",
      iata: "BCN",
    },
    {
      value: "rome",
      city: "Rome",
      airport: "Leonardo da Vinci-Fiumicino Airport",
      iata: "FCO",
    },
    {
      value: "milan",
      city: "Milan",
      airport: "Milan Malpensa Airport",
      iata: "MXP",
    },
    {
      value: "lisbon",
      city: "Lisbon",
      airport: "Humberto Delgado Airport",
      iata: "LIS",
    },
    {
      value: "vienna",
      city: "Vienna",
      airport: "Vienna International Airport",
      iata: "VIE",
    },
    { value: "zurich", city: "Zurich", airport: "Zurich Airport", iata: "ZRH" },
    {
      value: "johannesburg",
      city: "Johannesburg",
      airport: "O.R. Tambo International Airport",
      iata: "JNB",
    },
    {
      value: "cape_town",
      city: "Cape Town",
      airport: "Cape Town International Airport",
      iata: "CPT",
    },
    {
      value: "durban",
      city: "Durban",
      airport: "King Shaka International Airport",
      iata: "DUR",
    },
    {
      value: "gqeberha",
      city: "Gqeberha",
      airport: "Chief Dawid Stuurman International Airport",
      iata: "PLZ",
    },
    {
      value: "nairobi",
      city: "Nairobi",
      airport: "Jomo Kenyatta International Airport",
      iata: "NBO",
    },
    {
      value: "harare",
      city: "Harare",
      airport: "Robert Gabriel Mugabe International Airport",
      iata: "HRE",
    },
    {
      value: "bulawayo",
      city: "Bulawayo",
      airport: "Joshua Mqabuko Nkomo International Airport",
      iata: "BUQ",
    },
    {
      value: "victoria_falls",
      city: "Victoria Falls",
      airport: "Victoria Falls International Airport",
      iata: "VFA",
    },
  ];
  const attractionOptions: AttractionOption[] = [
    {
      value: "victoria_falls",
      label: "Victoria Falls",
      nearestAirport: "Victoria Falls International Airport (VFA)",
    },
    {
      value: "hwange_national_park",
      label: "Hwange National Park",
      nearestAirport: "Victoria Falls International Airport (VFA)",
    },
    {
      value: "mana_pools",
      label: "Mana Pools",
      nearestAirport: "Robert Gabriel Mugabe International Airport (HRE)",
    },
    {
      value: "great_zimbabwe",
      label: "Great Zimbabwe",
      nearestAirport: "Joshua Mqabuko Nkomo International Airport (BUQ)",
    },
    {
      value: "matobo_national_park",
      label: "Matobo National Park",
      nearestAirport: "Joshua Mqabuko Nkomo International Airport (BUQ)",
    },
    {
      value: "eastern_highlands",
      label: "Eastern Highlands",
      nearestAirport: "Robert Gabriel Mugabe International Airport (HRE)",
    },
    {
      value: "nyanga_national_park",
      label: "Nyanga National Park",
      nearestAirport: "Robert Gabriel Mugabe International Airport (HRE)",
    },
    {
      value: "gonarezhou",
      label: "Gonarezhou National Park",
      nearestAirport: "Robert Gabriel Mugabe International Airport (HRE)",
    },
    {
      value: "kariba",
      label: "Lake Kariba",
      nearestAirport: "Robert Gabriel Mugabe International Airport (HRE)",
    },
  ];

  const [origin, setOrigin] = useState("berlin");
  const [arrivalCity, setArrivalCity] = useState("victoria_falls");
  const [tripType, setTripType] = useState<TripType>("round_trip");
  const [startDate, setStartDate] = useState(() =>
    formatDateForInput(new Date())
  );
  const [endDate, setEndDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return formatDateForInput(nextWeek);
  });
  const [multiCityInput, setMultiCityInput] = useState(
    "Victoria Falls, Hwange"
  );
  const [budget, setBudget] = useState("medium");
  const [comfort, setComfort] = useState("standard");
  const [days] = useState(7);
  const [adultPassengers, setAdultPassengers] = useState("1");
  const [infantPassengers, setInfantPassengers] = useState("");
  const [interests, setInterests] = useState<Interest[]>([
    "wildlife",
    "culture",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"ai" | "fallback" | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);
  const adultCount = Number(adultPassengers) || 0;
  const infantCount = Number(infantPassengers) || 0;
  const selectedDeparture =
    departureOptions.find(item => item.value === origin) ?? departureOptions[0];
  const selectedArrival =
    attractionOptions.find(item => item.value === arrivalCity) ??
    attractionOptions[0];

  const interestOptions: Array<{ value: Interest; label: string }> = [
    {
      value: "wildlife",
      label:
        t("tourism.onesa.trip_planner.interests_options.wildlife") ||
        "Wildlife",
    },
    {
      value: "culture",
      label:
        t("tourism.onesa.trip_planner.interests_options.culture") || "Culture",
    },
    {
      value: "adventure",
      label:
        t("tourism.onesa.trip_planner.interests_options.adventure") ||
        "Adventure",
    },
    {
      value: "food",
      label: t("tourism.onesa.trip_planner.interests_options.food") || "Food",
    },
    {
      value: "history",
      label:
        t("tourism.onesa.trip_planner.interests_options.history") || "History",
    },
    {
      value: "nature",
      label:
        t("tourism.onesa.trip_planner.interests_options.nature") || "Nature",
    },
  ];

  const selectedInterestSet = useMemo(() => new Set(interests), [interests]);
  const computedTripDays = useMemo(() => {
    if (!startDate || !endDate) return days;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
      return days;
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.min(60, diffDays));
  }, [startDate, endDate, days]);

  const toggleInterest = (value: Interest) => {
    setInterests(prev => {
      if (prev.includes(value)) {
        const next = prev.filter(item => item !== value);
        return next.length === 0 ? prev : next;
      }
      return [...prev, value];
    });
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if ("showPicker" in input && typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  };

  const adjustPassengerCount = (
    current: string,
    delta: number,
    min: number,
    max: number
  ): string => {
    const base = Number(current);
    const safeBase = Number.isFinite(base) ? base : min;
    const next = Math.max(min, Math.min(max, safeBase + delta));
    return String(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const normalizedAdults = Math.max(
      1,
      Math.min(50, Number(adultPassengers) || 1)
    );
    const normalizedInfants = Math.max(
      0,
      Math.min(20, Number(infantPassengers) || 0)
    );
    const totalTravelers = Math.max(
      1,
      Math.min(70, normalizedAdults + normalizedInfants)
    );
    try {
      const { data } = await requestOnesaTripPlan(
        {
          origin: selectedDeparture.city,
          departureAirportCity: selectedDeparture.city,
          departureAirport: `${selectedDeparture.airport} (${selectedDeparture.iata})`,
          arrivalCity: selectedArrival.label,
          arrivalAttraction: selectedArrival.label,
          tripType,
          startDate,
          endDate: tripType === "one_way" ? "" : endDate,
          multiCity: tripType === "multi_trip",
          multiCityCities:
            tripType === "multi_trip"
              ? multiCityInput
                  .split(",")
                  .map(item => item.trim())
                  .filter(Boolean)
              : [],
          budget,
          comfort,
          days: Math.max(1, Math.min(60, Number(computedTripDays) || 7)),
          travelers: totalTravelers,
          adults: normalizedAdults,
          infants: normalizedInfants,
          interests,
          language: i18n.resolvedLanguage ?? i18n.language ?? "en",
        },
        { timeout: 240000 }
      );
      const plan = data?.plan as PlanResult | undefined;
      if (!plan) throw new Error("Plan generation returned no data.");
      setResult(plan);
      setSource(data?.source === "ai" ? "ai" : "fallback");
    } catch {
      const fallbackPlan = buildClientFallbackPlan({
        departureAirport: `${selectedDeparture.airport} (${selectedDeparture.iata})`,
        arrivalAttraction: selectedArrival.label,
        arrivalAirport: selectedArrival.nearestAirport,
        comfort,
        budget,
        days: Math.max(1, Math.min(60, Number(computedTripDays) || 7)),
        travelers: totalTravelers,
      });
      setResult(fallbackPlan);
      setSource("fallback");
      setError("");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push(t("tourism.onesa.trip_planner.pdf_title") || "Onesa Trip Plan");
    lines.push("----------------------------------------");
    lines.push(
      `${t("tourism.onesa.trip_planner.summary") || "Summary"}: ${result.summary}`
    );
    lines.push(
      `${t("tourism.onesa.trip_planner.optimized_for") || "Optimized for"}: ${result.optimizedFor}`
    );
    lines.push(
      `${t("tourism.onesa.trip_planner.estimated_total") || "Estimated total"}: USD ${result.estimatedTotalUsd}`
    );
    lines.push("");
    lines.push(
      `${t("tourism.onesa.trip_planner.flights") || "Flights"}: ${result.flights.route} (${result.flights.cabin}) - USD ${result.flights.estimatedCostUsd}`
    );
    lines.push(
      `${t("tourism.onesa.trip_planner.hotels") || "Hotels"}: ${result.hotels.area} (${result.hotels.style}) - USD ${result.hotels.estimatedCostUsd}`
    );
    lines.push(
      `${t("tourism.onesa.trip_planner.car_hire") || "Car hire"}: ${result.carHire.vehicleClass} - USD ${result.carHire.estimatedCostUsd}`
    );
    lines.push("");
    lines.push(
      `${t("tourism.onesa.trip_planner.experiences") || "Experiences"}:`
    );
    result.experiences.forEach(item => {
      lines.push(
        `- ${item.name} (${item.location}) - USD ${item.estimatedCostUsd}`
      );
    });
    lines.push("");
    lines.push(
      `${t("tourism.onesa.trip_planner.itinerary") || "Personalized Itinerary"}:`
    );
    result.itinerary.forEach(day => {
      lines.push(
        `Day ${day.day}: ${day.title} - USD ${day.estimatedDailyCostUsd}`
      );
      lines.push(`  ${day.details}`);
    });

    const bytes = createSimplePdf(lines);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const link = document.createElement("a");
    const fileNameBase = (
      t("tourism.onesa.trip_planner.pdf_filename") || "onesa-trip-plan"
    )
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileNameBase}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <Layout>
      <section className="document-section bg-slate-950 relative overflow-hidden">
        <div className="container relative z-10 px-6 mx-auto">
          <div className="content-panel editorial-panel p-8 md:p-10">
            <div className="mb-8 text-center">
              <Badge className="bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase tracking-widest text-[10px] font-black">
                {t("tourism.onesa.trip_planner.badge") || "Onesa AI Travel"}
              </Badge>
              <h1 className="page-title mt-3">
                {t("tourism.onesa.trip_planner.title") ||
                  "Onesa Booking Information"}
              </h1>
              <p className="section-subtitle-compact">
                {t("tourism.onesa.trip_planner.subtitle") ||
                  "Build a season-aware trip optimized for cost and comfort across flights, hotels, experiences, and car hire."}
              </p>
              <p className="text-xs text-white/70 mt-3">
                {t("tourism.onesa.trip_planner.booking_focus") ||
                  "Use this page for booking information and recommendations before you confirm travel."}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.origin") || "Departure city"}
                <select
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                >
                  {departureOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.city} - {option.iata}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.arrival_city") || "Arrival city"}
                <select
                  value={arrivalCity}
                  onChange={e => setArrivalCity(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                >
                  {attractionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-white/70">
                  {t("tourism.onesa.trip_planner.nearest_airport_hint") ||
                    "Nearest airport (auto-selected by engine)"}
                  :{" "}
                  <span className="text-white/80">
                    {selectedArrival.nearestAirport}
                  </span>
                </p>
              </label>

              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.trip_type") || "Trip type"}
                <select
                  value={tripType}
                  onChange={e => setTripType(e.target.value as TripType)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                >
                  <option value="one_way">
                    {t(
                      "tourism.onesa.trip_planner.trip_type_options.one_way"
                    ) || "One way"}
                  </option>
                  <option value="round_trip">
                    {t(
                      "tourism.onesa.trip_planner.trip_type_options.round_trip"
                    ) || "Round trip"}
                  </option>
                  <option value="multi_trip">
                    {t(
                      "tourism.onesa.trip_planner.trip_type_options.multi_trip"
                    ) || "Multi-trip"}
                  </option>
                </select>
              </label>

              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.budget") || "Budget profile"}
                <select
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                >
                  <option value="low">
                    {t("tourism.onesa.trip_planner.budget_options.low") ||
                      "Low"}
                  </option>
                  <option value="medium">
                    {t("tourism.onesa.trip_planner.budget_options.medium") ||
                      "Medium"}
                  </option>
                  <option value="high">
                    {t("tourism.onesa.trip_planner.budget_options.high") ||
                      "High"}
                  </option>
                </select>
              </label>

              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.comfort") ||
                  "Comfort preference"}
                <select
                  value={comfort}
                  onChange={e => setComfort(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                >
                  <option value="budget">
                    {t("tourism.onesa.trip_planner.comfort_options.budget") ||
                      "Budget"}
                  </option>
                  <option value="standard">
                    {t("tourism.onesa.trip_planner.comfort_options.standard") ||
                      "Standard"}
                  </option>
                  <option value="premium">
                    {t("tourism.onesa.trip_planner.comfort_options.premium") ||
                      "Premium"}
                  </option>
                </select>
              </label>

              <div className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.passengers") || "Passengers"}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
                    <span
                      className={`text-xs transition-all duration-200 ${adultPassengers ? "text-white/70" : "text-white/70"}`}
                    >
                      {adultCount}{" "}
                      {adultCount === 1
                        ? t("tourism.onesa.trip_planner.adult") || "Adult"
                        : t("tourism.onesa.trip_planner.adults") || "Adults"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAdultPassengers(prev =>
                            adjustPassengerCount(prev, -1, 1, 50)
                          )
                        }
                        className="h-6 w-6 rounded-md border border-white/20 text-white/80 hover:text-white hover:border-zim-gold/50 transition-colors"
                        aria-label={
                          t("tourism.onesa.trip_planner.decrease_adults") ||
                          "Decrease adults"
                        }
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAdultPassengers(prev =>
                            adjustPassengerCount(prev, 1, 1, 50)
                          )
                        }
                        className="h-6 w-6 rounded-md border border-white/20 text-white/80 hover:text-white hover:border-zim-gold/50 transition-colors"
                        aria-label={
                          t("tourism.onesa.trip_planner.increase_adults") ||
                          "Increase adults"
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3">
                    <span
                      className={`text-xs transition-all duration-200 ${infantPassengers ? "text-white/70" : "text-white/70"}`}
                    >
                      {infantCount}{" "}
                      {infantCount === 1
                        ? t("tourism.onesa.trip_planner.infant") || "Infant"
                        : t("tourism.onesa.trip_planner.infants") || "Infants"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setInfantPassengers(prev =>
                            adjustPassengerCount(prev, -1, 0, 20)
                          )
                        }
                        className="h-6 w-6 rounded-md border border-white/20 text-white/80 hover:text-white hover:border-zim-gold/50 transition-colors"
                        aria-label={
                          t("tourism.onesa.trip_planner.decrease_infants") ||
                          "Decrease infants"
                        }
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setInfantPassengers(prev =>
                            adjustPassengerCount(prev, 1, 0, 20)
                          )
                        }
                        className="h-6 w-6 rounded-md border border-white/20 text-white/80 hover:text-white hover:border-zim-gold/50 transition-colors"
                        aria-label={
                          t("tourism.onesa.trip_planner.increase_infants") ||
                          "Increase infants"
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-white/80 grid grid-cols-2 gap-3">
                <label className="block text-sm text-white/80">
                  {t("tourism.onesa.trip_planner.start_date") || "Start date"}
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 focus-within:border-zim-gold/60">
                    <input
                      ref={startDateInputRef}
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      onClick={() => openDatePicker(startDateInputRef.current)}
                      onKeyDown={e => e.preventDefault()}
                      onPaste={e => e.preventDefault()}
                      inputMode="none"
                      className="w-full bg-transparent text-white outline-none"
                    />
                    <button
                      type="button"
                      aria-label={
                        t(
                          "tourism.onesa.trip_planner.open_start_date_picker"
                        ) || "Open start date calendar"
                      }
                      onClick={() => openDatePicker(startDateInputRef.current)}
                      className="rounded-lg border border-white/20 p-1.5 text-white/80 hover:text-zim-gold hover:border-zim-gold/50 transition-colors"
                    >
                      <Calendar className="h-4 w-4" />
                    </button>
                  </div>
                </label>

                {tripType !== "one_way" ? (
                  <label className="block text-sm text-white/80">
                    {t("tourism.onesa.trip_planner.end_date") || "End date"}
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 focus-within:border-zim-gold/60">
                      <input
                        ref={endDateInputRef}
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        onClick={() => openDatePicker(endDateInputRef.current)}
                        onKeyDown={e => e.preventDefault()}
                        onPaste={e => e.preventDefault()}
                        inputMode="none"
                        className="w-full bg-transparent text-white outline-none"
                      />
                      <button
                        type="button"
                        aria-label={
                          t(
                            "tourism.onesa.trip_planner.open_end_date_picker"
                          ) || "Open return date calendar"
                        }
                        onClick={() => openDatePicker(endDateInputRef.current)}
                        className="rounded-lg border border-white/20 p-1.5 text-white/80 hover:text-zim-gold hover:border-zim-gold/50 transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                      </button>
                    </div>
                  </label>
                ) : (
                  <div />
                )}
              </div>

              <label className="text-sm text-white/80">
                {t("tourism.onesa.trip_planner.days") || "Trip days"}
                <input
                  type="number"
                  readOnly
                  value={computedTripDays}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white/80 outline-none cursor-not-allowed"
                />
              </label>

              <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-sm text-white/80">
                  {t("tourism.onesa.trip_planner.multi_city") ||
                    "Multi-city trip"}
                </p>
                {tripType === "multi_trip" ? (
                  <div className="mt-3">
                    <p className="text-xs text-white/70 mb-1">
                      {t("tourism.onesa.trip_planner.multi_city_cities") ||
                        "Cities (comma separated)"}
                    </p>
                    <input
                      value={multiCityInput}
                      onChange={e => setMultiCityInput(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-zim-gold/60"
                      placeholder={t(
                        "tourism.onesa.trip_planner.multi_city_placeholder",
                        {
                          defaultValue: "Victoria Falls, Hwange, Bulawayo",
                        }
                      )}
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-white/70">
                    {t("tourism.onesa.trip_planner.multi_city_hint") ||
                      "Select Multi-trip to add additional cities."}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <p className="text-sm text-white/80 mb-3">
                  {t("tourism.onesa.trip_planner.interests") || "Interests"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map(option => {
                    const active = selectedInterestSet.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleInterest(option.value)}
                        className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                          active
                            ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                            : "border-white/20 bg-white/[0.03] text-white/70 hover:text-white"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p role="alert" className="md:col-span-2 text-red-300 text-sm">
                  {error}
                </p>
              ) : null}

              <div className="md:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-6"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {loading
                    ? t("tourism.onesa.trip_planner.generating") ||
                      "Generating..."
                    : t("tourism.onesa.trip_planner.generate") ||
                      "Generate trip plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {result ? (
        <section className="pb-12 bg-slate-950 relative overflow-hidden">
          <div className="container relative z-10 px-6 mx-auto">
            <div className="content-panel editorial-panel p-8 md:p-10">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Badge className="bg-zim-gold/10 text-zim-gold border border-zim-gold/20 uppercase tracking-widest text-[10px] font-black">
                  {source === "ai"
                    ? t("tourism.onesa.trip_planner.ai_optimized") ||
                      "AI Optimized"
                    : t("tourism.onesa.trip_planner.fallback_plan") ||
                      "Smart Fallback Plan"}
                </Badge>
                <span className="text-white/70 text-xs">
                  {result.optimizedFor}
                </span>
                <Button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="ml-auto bg-zim-gold text-zim-black hover:bg-white font-black uppercase tracking-widest text-[10px] rounded-full px-5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("tourism.onesa.trip_planner.download_pdf") ||
                    "Download PDF"}
                </Button>
              </div>

              <h2 className="text-xl font-black tracking-tight text-white mb-3">
                {result.summary}
              </h2>
              <p className="text-zim-gold text-sm font-black uppercase tracking-wider mb-8">
                <Wallet className="h-4 w-4 inline mr-2" />
                {(t("tourism.onesa.trip_planner.estimated_total") ||
                  "Estimated total") + ": $"}
                {result.estimatedTotalUsd.toLocaleString()}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/70 font-black mb-2">
                    <Plane className="h-4 w-4 inline mr-2" />
                    {t("tourism.onesa.trip_planner.flights") || "Flights"}
                  </p>
                  <p className="text-white text-sm font-bold">
                    {result.flights.route}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    {result.flights.cabin}
                  </p>
                  <p className="text-zim-gold text-xs font-black mt-2">
                    ${result.flights.estimatedCostUsd}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/70 font-black mb-2">
                    <Hotel className="h-4 w-4 inline mr-2" />
                    {t("tourism.onesa.trip_planner.hotels") || "Hotels"}
                  </p>
                  <p className="text-white text-sm font-bold">
                    {result.hotels.area}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    {result.hotels.style}
                  </p>
                  <p className="text-zim-gold text-xs font-black mt-2">
                    ${result.hotels.estimatedCostUsd}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/70 font-black mb-2">
                    <Car className="h-4 w-4 inline mr-2" />
                    {t("tourism.onesa.trip_planner.car_hire") || "Car hire"}
                  </p>
                  <p className="text-white text-sm font-bold">
                    {result.carHire.vehicleClass}
                  </p>
                  <p className="text-white/70 text-xs mt-1">
                    {result.carHire.rationale}
                  </p>
                  <p className="text-zim-gold text-xs font-black mt-2">
                    ${result.carHire.estimatedCostUsd}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-base font-black text-white tracking-tight mb-3">
                  {t("tourism.onesa.trip_planner.experiences") || "Experiences"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.experiences.map(item => (
                    <div
                      key={`${item.name}-${item.location}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="text-white font-bold text-sm">
                        {item.name}
                      </p>
                      <p className="text-white/70 text-xs">{item.location}</p>
                      <p className="text-zim-gold text-xs font-black mt-2">
                        ${item.estimatedCostUsd}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-white tracking-tight mb-3">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  {t("tourism.onesa.trip_planner.itinerary") ||
                    "Personalized Itinerary"}
                </h3>
                <div className="space-y-3">
                  {result.itinerary.map(dayPlan => (
                    <div
                      key={dayPlan.day}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="text-zim-gold text-[10px] uppercase tracking-widest font-black">
                        {(t("tourism.onesa.trip_planner.day") || "Day") +
                          " " +
                          dayPlan.day}
                      </p>
                      <p className="text-white font-bold text-sm mt-1">
                        {dayPlan.title}
                      </p>
                      <p className="text-white/70 text-xs mt-1">
                        {dayPlan.details}
                      </p>
                      <p className="text-white/80 text-xs mt-2">
                        {(t("tourism.onesa.trip_planner.estimated") ||
                          "Estimated") +
                          ": $" +
                          dayPlan.estimatedDailyCostUsd}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </Layout>
  );
}
