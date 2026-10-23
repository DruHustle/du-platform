import { tripText } from "@shared/tripPlanCopy";
import type { PlanResult } from "./tripPlan";

export function buildClientFallbackPlan(params: {
  language: string;
  departureAirport: string;
  arrivalAttraction: string;
  arrivalAirport: string;
  comfort: string;
  budget: string;
  days: number;
  travelers: number;
}): PlanResult {
  const text = (
    key: Parameters<typeof tripText>[1],
    values?: Record<string, string | number>
  ) => tripText(params.language, key, values);
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
    summary: text("summary_client", {
      days: nights,
      place: params.arrivalAttraction,
      budget: text(
        params.budget === "high"
          ? "high"
          : params.budget === "low"
            ? "low"
            : "medium"
      ),
      comfort: text(
        params.comfort === "premium"
          ? "premium"
          : params.comfort === "budget"
            ? "budget"
            : "standard"
      ),
    }),
    optimizedFor: text("allowances"),
    estimatedTotalUsd: total,
    flights: {
      route: `${params.departureAirport} -> ${params.arrivalAirport}`,
      cabin:
        params.comfort === "premium"
          ? text("premium_cabin")
          : text("economy_cabin"),
      estimatedCostUsd: flightsCost,
      rationale: text("flight_client"),
    },
    hotels: {
      area: text("corridor", { place: params.arrivalAttraction }),
      style:
        params.comfort === "premium"
          ? text("premium_stay")
          : params.comfort === "budget"
            ? text("budget_stay")
            : text("standard_stay"),
      estimatedCostUsd: hotelsCost,
      rationale: text("hotel_client"),
    },
    carHire: {
      vehicleClass:
        params.comfort === "premium"
          ? text("premium_suv")
          : text("standard_suv"),
      estimatedCostUsd: carCost,
      rationale: text("car"),
    },
    experiences: [
      {
        name: text("sightseeing"),
        location: params.arrivalAttraction,
        estimatedCostUsd: Math.round(90 * params.travelers),
        rationale: text("activity_client"),
      },
      {
        name: text("food_culture"),
        location: "Harare / Bulawayo",
        estimatedCostUsd: Math.round(60 * params.travelers),
        rationale: text("food_client"),
      },
    ],
    itinerary: Array.from({ length: nights }, (_v, i) => ({
      day: i + 1,
      title:
        i === 0
          ? text("arrival")
          : i === nights - 1
            ? text("departure")
            : text("highlights", { day: i + 1 }),
      details:
        i === 0
          ? text("arrival_client", {
              airport: params.arrivalAirport,
              place: params.arrivalAttraction,
            })
          : i === nights - 1
            ? text("return")
            : text("research_client"),
      estimatedDailyCostUsd: Math.round(total / nights),
    })),
  };
}
