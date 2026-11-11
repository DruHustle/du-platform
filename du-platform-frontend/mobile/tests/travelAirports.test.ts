import { describe, expect, it } from "vitest";
import {
  airportCode,
  matchingAirports,
  parseAirports,
} from "../src/travelAirports";

const airports = [
  { id: "HRE", name: "Harare", country: "ZW" },
  { id: "VFA", name: "Victoria Falls", country: "ZW" },
  { id: "SEZ", name: "Mahé", country: "SC" },
];

describe("airport lookup for native flight and accommodation searches", () => {
  it("validates the travel capabilities response before displaying entries", () => {
    expect(parseAirports({ locations: airports, resources: {} })).toEqual(
      airports,
    );
    for (const locations of [
      [],
      null,
      ["HRE"],
      [{ ...airports[0], name: " " }],
      [{ ...airports[0], id: "Harare" }],
      [airports[0], airports[0]],
    ]) {
      expect(() => parseAirports({ locations })).toThrow();
    }
  });
  it("suggests by city, airport or country and accepts complete city names", () => {
    expect(matchingAirports("victor", airports)).toEqual([airports[1]]);
    expect(matchingAirports("vf", airports)).toEqual([airports[1]]);
    expect(matchingAirports("zw", airports)).toEqual(airports.slice(0, 2));
    expect(matchingAirports("mahe", airports)).toEqual([airports[2]]);
    expect(airportCode(" mahé ", airports)).toBe("SEZ");
    expect(airportCode("hre", airports)).toBe("HRE");
    expect(airportCode("Har", airports)).toBe("");
    expect(
      airportCode("Harare", [
        ...airports,
        { id: "ABC", name: "Harare", country: "XX" },
      ]),
    ).toBe("");
  });
  it("accepts manual three-letter codes during an outage and rejects unknown codes with a directory", () => {
    expect(airportCode(" hRe ", null)).toBe("HRE");
    expect(airportCode("Harare", null)).toBe("");
    expect(airportCode("123", null)).toBe("");
    expect(airportCode("XXX", airports)).toBe("");
  });
});
