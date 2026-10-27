import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));
import { api } from "@/lib/api";
import { loadSavedTravel } from "./api";
import { defaultTravelCriteria } from "@shared/travel";
const savedTrip = () => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Private trip",
  kind: "trip",
  draft: { criteria: defaultTravelCriteria(), searches: [], estimates: [] },
  updatedAt: "2026-10-27T00:00:00.000Z",
});
describe("Travel API response contract", () => {
  it("uses the array already unwrapped by the shared interceptor", async () => {
    const rows = [savedTrip()];
    vi.mocked(api.get).mockResolvedValueOnce({ data: rows });
    expect(await loadSavedTravel()).toEqual(rows);
    expect(api.get).toHaveBeenCalledWith("/travel/saved");
  });
  it("turns a malformed successful response into recoverable failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
    await expect(loadSavedTravel()).rejects.toThrow("TRAVEL_INVALID_RESPONSE");
  });
  it.each([
    [{}],
    [{ ...savedTrip(), draft: null }],
    [{ ...savedTrip(), updatedAt: "not-a-date" }],
    [{ ...savedTrip(), id: "not-a-uuid" }],
    [savedTrip(), savedTrip()],
    Array.from({ length: 31 }, (_, i) => ({
      ...savedTrip(),
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    })),
  ])(
    "rejects malformed, duplicate or unbounded saved records (%#)",
    async rows => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: rows });
      await expect(loadSavedTravel()).rejects.toThrow(
        "TRAVEL_INVALID_RESPONSE"
      );
    }
  );
});
