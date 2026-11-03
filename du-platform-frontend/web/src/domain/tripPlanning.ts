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
// The backend owns itinerary construction and business rules. The client only
// validates the response before rendering and exporting it.
export function validateTripPlan(raw: unknown, _input: TripPlanningInput): PlanResult | null {
  const parsed = tripPlanSchema.safeParse(raw);
  if (!parsed.success) return null;
  const plan = parsed.data;
  const total = plan.flights.estimatedCostUsd + plan.hotels.estimatedCostUsd +
    plan.carHire.estimatedCostUsd + plan.experiences.reduce((sum, item) => sum + item.estimatedCostUsd, 0) +
    (plan.contingencyUsd ?? 0);
  if (Math.abs(total - plan.estimatedTotalUsd) > 0.01) return null;
  if (Math.abs(plan.itinerary.reduce((sum, day) => sum + day.estimatedDailyCostUsd, 0) - plan.estimatedTotalUsd) > 0.01) return null;
  return plan;
}
