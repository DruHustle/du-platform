import { describe, expect, it } from "vitest";
import { inferNearestPlace } from "./arExperienceGuidance";
import { getSpeechLanguageCode } from "./arExperienceText";

describe("AR destination context selection", () => {
  it.each([
    [-20.15, 28.58, "bulawayo"],
    [-18.8, 26.9, "hwange"],
    [-17.93, 25.85, "victoria_falls"],
    [-17.83, 31.05, "harare"],
    [-20.27, 30.93, "great_zimbabwe"],
  ])("selects a nearby listed place at %s, %s", (lat, lon, expected) => {
    expect(inferNearestPlace(lat, lon)).toBe(expected);
  });

  it.each([
    [52.52, 13.4],
    [0, 0],
    [NaN, 30],
    [-20, Infinity],
    [91, 0],
  ])("does not invent a local destination for %s, %s", (lat, lon) =>
    expect(inferNearestPlace(lat, lon)).toBeNull()
  );
});

describe("tourism speech locale", () => {
  it("uses Zimbabwean Northern Ndebele for the Ndebele interface", () => {
    const locale = new Intl.Locale(getSpeechLanguageCode("nd"));
    expect(locale.language).toBe("nd");
    expect(locale.region).toBe("ZW");
  });
});
