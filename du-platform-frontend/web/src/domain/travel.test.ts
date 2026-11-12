import { describe, expect, it, vi } from "vitest";
import {
  defaultTravelCriteria,
  guestTravelDraftSchema,
  isTravelNationality,
  savedTravelSchema,
  validateTravel,
} from "./travel";

describe("guest trip drafts", () => {
  it.each([
    { guestNationality: "D" },
    { adults: 10 },
    { rooms: 1.5 },
    { childAges: [18] },
  ])(
    "keeps completed searches and allowances during a form edit (%j)",
    edit => {
      const criteria = defaultTravelCriteria();
      const draft = {
        criteria: { ...criteria, ...edit },
        searches: [{ category: "flights", criteria }],
        estimates: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            category: "stays",
            amount: 75,
            currency: "GBP",
          },
        ],
      };
      const restored = guestTravelDraftSchema.parse(
        JSON.parse(JSON.stringify(draft))
      );
      expect(restored).toEqual(draft);
      expect(validateTravel(restored.criteria, "stays").success).toBe(false);
      expect(
        savedTravelSchema.safeParse({
          name: "Family trip",
          kind: "trip",
          draft: restored,
        }).success
      ).toBe(false);
    }
  );
});

it("keeps stay searches usable without the browser region-name catalog", () => {
  vi.stubGlobal("Intl", { ...Intl, DisplayNames: undefined });
  try {
    expect(isTravelNationality("ZW")).toBe(true);
    expect(isTravelNationality("ZZ")).toBe(false);
    expect(isTravelNationality("Z")).toBe(false);
  } finally {
    vi.unstubAllGlobals();
  }
});
