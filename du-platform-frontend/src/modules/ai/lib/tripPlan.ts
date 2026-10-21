import { z } from "zod";

const text = z.string().max(20000);
const cost = z.number().finite().nonnegative();
// Validate service responses before rendering nested fields or exporting a PDF.
export const tripPlanSchema = z.object({
  summary: text.min(1),
  optimizedFor: text.min(1),
  estimatedTotalUsd: cost,
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
        title: text,
        details: text,
        estimatedDailyCostUsd: cost,
      })
    )
    .min(1)
    .max(60),
});
export type PlanResult = z.infer<typeof tripPlanSchema>;
