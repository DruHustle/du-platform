import { afterEach, describe, expect, it, vi } from "vitest";
import type { TravelQuote } from "../../../domain/travel";
import { awinPlacement, issueAwinReferral } from "../awinReferral";

const env = {
  TRAVEL_AWIN_PUBLISHER_ID: "12", TRAVEL_AWIN_ADVERTISER_ID: "34",
  TRAVEL_AWIN_API_TOKEN: "fixture", TRAVEL_AWIN_APPROVED_CHANNELS: "web,android",
};
const quote = {
  provider: "Kiwi.com", id: "dd965856-40c5-4424-aa0f-8e4165d0e025",
  bookingUrl: "https://kiwi.com/u/fixture", reviewAfter: "2036-01-01T00:00:00.000Z",
} as TravelQuote;
const details = {
  id: 34, membershipStatus: "Joined", deeplinkEnabled: true, validDomains: [{domain: "kiwi.com"}],
};
function partner(info = details, destination = quote.bookingUrl) {
  const link = new URL("https://www.awin1.com/cread.php");
  link.search = new URLSearchParams({ awinmid: "34", awinaffid: "12", clickref: quote.id, ued: destination }).toString();
  return vi.fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ programmeInfo: info }))
    .mockResolvedValueOnce(Response.json({ url: link.href }));
}
const db = { execute: vi.fn().mockResolvedValue([[{}]]) };
afterEach(() => { db.execute.mockClear(); });
describe("Kiwi via Awin", () => {
  it("requires provider IDs, explicit approval for the placement, and credentials", () => {
    expect(awinPlacement("web", {})).toBeNull();
    expect(awinPlacement("ios", env)).toBeNull();
    expect(awinPlacement("android", { ...env, TRAVEL_AWIN_APPROVED_CHANNELS: "web" })).toBeNull();
    expect(awinPlacement("web", { ...env, TRAVEL_AWIN_PUBLISHER_ID: "example" })).toBeNull();
  });
  it.each(["web", "android"] as const)("issues the exact selected flight on %s after recording its reference", async channel => {
    const fetcher = partner();
    const link = new URL(await issueAwinReferral(quote, channel, db, fetcher, env));
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      advertiserId: 34, destinationUrl: quote.bookingUrl, parameters: { clickref: quote.id }, shorten: false,
    });
    expect(link.searchParams.get("cons")).toBe("1");
    expect(link.searchParams.get("ued")).toBe(quote.bookingUrl);
    expect(db.execute.mock.calls[0][1]).toEqual([quote.id, "12", "34", channel]);
  });
  it.each([
    { ...details, id: 900 }, { ...details, membershipStatus: "Suspended" },
    { ...details, deeplinkEnabled: false }, { ...details, validDomains: [] },
  ])("rejects a mismatched or unapproved programme before building a link", async info => {
    const fetcher = partner(info);
    await expect(issueAwinReferral(quote, "web", db, fetcher, env)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("rejects a generic home-page redirect and a quote that expired during the handoff", async () => {
    await expect(issueAwinReferral(quote, "web", db, partner(details, "https://kiwi.com/"), env)).rejects.toThrow();
    await expect(issueAwinReferral({ ...quote, reviewAfter: new Date(0).toISOString() }, "web", db, partner(), env)).rejects.toThrow();
    expect(db.execute).not.toHaveBeenCalled();
  });
  it("keeps unledgered links from leaving the server", async () => {
    const failingDb = { execute: vi.fn().mockRejectedValue(new Error("database unavailable")) };
    await expect(issueAwinReferral(quote, "web", failingDb, partner(), env)).rejects.toThrow();
  });
});
