import { describe, expect, it } from "vitest";
import {
  buildSampleTripPlan,
  validateTripPlan,
} from "../../../contracts/tripPlanning";
const input = {
  language: "en",
  arrivalAttraction: "Victoria Falls",
  departureAirport: "BER",
  arrivalAirport: "VFA",
  comfort: "standard",
  budget: "medium",
  days: 7,
  travelers: 2,
  interests: ["wildlife", "culture"],
};
describe("geographically coherent sample itineraries", () => {
  it("keeps Victoria Falls local, counts nights and charges each scheduled activity once", () => {
    const p = buildSampleTripPlan(input);
    expect(p.nights).toBe(6);
    expect(p.itinerary.every(d => d.location === "Victoria Falls")).toBe(true);
    expect(JSON.stringify(p)).not.toMatch(/Harare|Hwange/);
    expect(p.experiences).toHaveLength(2);
    expect(validateTripPlan(p, input)).toEqual(p);
    expect(p.itinerary.reduce((n, d) => n + d.estimatedDailyCostUsd, 0)).toBe(
      p.estimatedTotalUsd
    );
  });
  it("represents each selected region and every outward/return transfer", () => {
    const request = {
      ...input,
      multiCity: true,
      multiCityCities: ["Hwange", "Harare"],
    };
    const p = buildSampleTripPlan(request);
    expect(new Set(p.itinerary.map(d => d.location))).toEqual(
      new Set(["Victoria Falls", "Hwange", "Harare"])
    );
    expect(p.itinerary.filter(d => d.transferFrom)).toHaveLength(3);
    expect(validateTripPlan(p, request)).toEqual(p);
  });
  it("uses selected dates and rejects missing days, negative costs and arithmetic drift", () => {
    const request = {
      ...input,
      startDate: "2027-05-01",
      endDate: "2027-05-04",
    };
    const p = buildSampleTripPlan(request);
    expect(p.itinerary).toHaveLength(4);
    expect(p.nights).toBe(3);
    expect(p.itinerary[3].date).toBe("2027-05-04");
    expect(
      validateTripPlan({ ...p, itinerary: p.itinerary.slice(1) }, request)
    ).toBeNull();
    expect(
      validateTripPlan(
        { ...p, estimatedTotalUsd: p.estimatedTotalUsd + 10 },
        request
      )
    ).toBeNull();
    expect(
      validateTripPlan(
        { ...p, flights: { ...p.flights, estimatedCostUsd: -10 } },
        request
      )
    ).toBeNull();
  });
  it("rejects invented destinations and unaccounted transfers in AI output", () => {
    const p = buildSampleTripPlan(input);
    p.itinerary[2].location = "Harare";
    expect(validateTripPlan(p, input)).toBeNull();
  });
});

it("keeps one-way plans at their last selected destination and rejects invalid dates", () => {
  const request = {
    ...input,
    tripType: "one_way",
    multiCity: true,
    multiCityCities: ["Hwange"],
    startDate: "2027-05-01",
  };
  const p = buildSampleTripPlan(request);
  expect(p.itinerary.at(-1)?.location).toBe("Hwange");
  expect(p.itinerary.filter(d => d.transferFrom)).toHaveLength(1);
  expect(() =>
    buildSampleTripPlan({ ...input, startDate: "2027-02-31" })
  ).toThrow("date");
  expect(() =>
    buildSampleTripPlan({
      ...input,
      startDate: "2027-05-04",
      endDate: "2027-05-01",
    })
  ).toThrow("date");
});

it("rejects repeated priced activities and prose that silently adds distant destinations", () => {
  const p = buildSampleTripPlan(input);
  p.itinerary[3].title = p.experiences[0].name;
  expect(validateTripPlan(p, input)).toBeNull();
  const q = buildSampleTripPlan(input);
  q.itinerary[3].details = "Visit Harare today";
  expect(validateTripPlan(q, input)).toBeNull();
});

it("rejects an activity charge that is not scheduled anywhere", () => {
  const p = buildSampleTripPlan(input);
  p.experiences[0].name = "Unscheduled private tour";
  expect(validateTripPlan(p, input)).toBeNull();
});
