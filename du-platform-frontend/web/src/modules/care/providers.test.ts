import { describe, expect, it } from "vitest";
import { careProviders, providerPages } from "./providers";

describe("Care information before a referral agreement", () => {
  it("opens only official, unattributed product pages for a diaspora applicant", () => {
    expect(careProviders("funeral", "GB", "ZW")).toEqual(["zb", "diaspora"]);
    expect(careProviders("repatriation", "DE", "ZA")).toEqual([
      "doves",
      "diaspora",
    ]);
    expect(Object.values(providerPages)).toEqual([
      "https://www.zb.co.zw/diaspora/cash-funeral-plan",
      "https://diasporainsurance.com/zimbabwe/",
      "https://doves.co.zw/global-plan/",
    ]);
    for (const value of Object.values(providerPages)) {
      const url = new URL(value);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    }
  });

  it("checks the applicant and covered person's residence independently", () => {
    expect(careProviders("funeral", "ZW", "ZW")).toEqual([]);
    expect(careProviders("repatriation", "GB", "ZW")).toEqual([]);
    expect(careProviders("funeral", "DE", "ZA")).toEqual([]);
    expect(careProviders("repatriation", "", "GB")).toEqual([]);
    expect(careProviders("funeral", "GB", "")).toEqual([]);
  });
});
