import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));
import { api } from "@/lib/api";
import {
  deleteSavedTravel,
  loadSavedTravel,
  loadTravelReference,
  saveTravel,
} from "./api";
import { defaultTravelCriteria } from "@/domain/travel";
const savedTrip = () => ({
  id: "00000000-0000-4000-8000-000000000001",
  name: "Private trip",
  kind: "trip",
  draft: { criteria: defaultTravelCriteria(), searches: [], estimates: [] },
  updatedAt: "2026-10-27T00:00:00.000Z",
});
describe("Travel API response contract", () => {
  it("requires backend reference data and rejects unsafe provider links", async () => {
    const reference = { locations: [{ id: "HRE", name: "Harare", country: "ZW" }], resources: { flights: "https://www.kayak.com/flights", stays: "https://www.kayak.com/hotels", "car-hire": "https://www.kayak.com/cars" } };
    vi.mocked(api.get).mockResolvedValueOnce({ data: reference });
    expect(await loadTravelReference()).toEqual(reference);
    vi.mocked(api.get).mockResolvedValueOnce({ data: { ...reference, resources: { ...reference.resources, flights: "https://evil.example/phish" } } });
    await expect(loadTravelReference()).rejects.toThrow();
    vi.mocked(api.get).mockResolvedValueOnce({ data: { categories: {} } });
    await expect(loadTravelReference()).rejects.toThrow();
  });
  it("requires a saved ID before confirming a private trip", async () => {
    const { id, name, draft } = savedTrip();
    const input = { name, draft, kind: "trip" as const };
    vi.mocked(api.post).mockResolvedValueOnce({ data: { id } });
    await saveTravel(input);
    expect(api.post).toHaveBeenCalledWith("/travel/saved", input);
    vi.mocked(api.post).mockResolvedValueOnce({ data: {} });
    await expect(saveTravel(input)).rejects.toThrow();
  });
  it("requires a deletion receipt before removing the trip from the list", async () => {
    const { id } = savedTrip();
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { removed: true } });
    await deleteSavedTravel(id);
    expect(api.delete).toHaveBeenCalledWith(`/travel/saved/${id}`);
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { removed: false } });
    await expect(deleteSavedTravel(id)).rejects.toThrow();
  });
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
