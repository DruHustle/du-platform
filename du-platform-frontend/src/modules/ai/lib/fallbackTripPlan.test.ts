import { expect, it } from "vitest";
import { buildClientFallbackPlan } from "./fallbackTripPlan";
const input = {
  departureAirport: "BER",
  arrivalAirport: "VFA",
  arrivalAttraction: "Victoria Falls",
  comfort: "premium",
  budget: "high",
  days: 5,
  travelers: 2,
};
it("localizes offline plans without changing allowances or itinerary length", () => {
  const english = buildClientFallbackPlan({ ...input, language: "en" });
  expect(english.estimatedTotalUsd).toBe(4650);
  for (const language of ["de", "sn", "nd"]) {
    const plan = buildClientFallbackPlan({ ...input, language });
    expect(plan.estimatedTotalUsd).toBe(english.estimatedTotalUsd);
    expect(plan.flights.estimatedCostUsd).toBe(
      english.flights.estimatedCostUsd
    );
    expect(plan.hotels.estimatedCostUsd).toBe(english.hotels.estimatedCostUsd);
    expect(plan.carHire.estimatedCostUsd).toBe(
      english.carHire.estimatedCostUsd
    );
    expect(plan.itinerary).toHaveLength(input.days);
    expect(plan.summary).toContain("Victoria Falls");
    expect(plan.summary).not.toBe(english.summary);
    expect(plan.itinerary[0].details).not.toBe(english.itinerary[0].details);
    expect(plan.optimizedFor).not.toBe(english.optimizedFor);
  }
  expect(buildClientFallbackPlan({ ...input, language: "de-DE" })).toEqual(
    buildClientFallbackPlan({ ...input, language: "de" })
  );
  expect(
    buildClientFallbackPlan({ ...input, language: "unsupported" })
  ).toEqual(english);
});
