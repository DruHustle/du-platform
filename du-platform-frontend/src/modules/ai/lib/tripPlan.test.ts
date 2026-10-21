import { describe, expect, it } from "vitest";
import { tripPlanSchema } from "./tripPlan";

const plan = {
  summary: "A draft itinerary",
  optimizedFor: "Nature",
  estimatedTotalUsd: 1500,
  flights: {
    route: "Berlin to Harare",
    cabin: "Economy",
    estimatedCostUsd: 900,
    rationale: "Estimate",
  },
  hotels: {
    area: "Harare",
    style: "Standard",
    estimatedCostUsd: 300,
    rationale: "Estimate",
  },
  carHire: {
    vehicleClass: "Compact",
    estimatedCostUsd: 100,
    rationale: "Estimate",
  },
  experiences: [
    {
      name: "Museum",
      location: "Harare",
      estimatedCostUsd: 20,
      rationale: "Estimate",
    },
  ],
  itinerary: [
    { day: 1, title: "Arrival", details: "Rest", estimatedDailyCostUsd: 180 },
  ],
};
describe("trip plan response validation", () => {
  it("accepts a complete draft for display and PDF export", () => {
    expect(tripPlanSchema.parse(plan)).toEqual(plan);
  });
  it.each([
    null,
    {},
    { ...plan, hotels: null },
    { ...plan, itinerary: {} },
    { ...plan, itinerary: [] },
    { ...plan, estimatedTotalUsd: -1 },
    { ...plan, estimatedTotalUsd: Infinity },
    { ...plan, experiences: [null] },
  ])("rejects unsafe or incomplete service data: %j", value => {
    expect(tripPlanSchema.safeParse(value).success).toBe(false);
  });
});
