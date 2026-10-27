import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/api", () => ({ api: { get: vi.fn() } }));
import { api } from "@/lib/api";
import { loadSavedTravel } from "./api";
describe("Travel API response contract", () => {
  it("uses the array already unwrapped by the shared interceptor", async () => {
    const rows = [{ id: "synthetic-trip", name: "Private trip" }];
    vi.mocked(api.get).mockResolvedValueOnce({ data: rows });
    expect(await loadSavedTravel()).toEqual(rows);
    expect(api.get).toHaveBeenCalledWith("/travel/saved");
  });
  it("turns a malformed successful response into recoverable failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
    await expect(loadSavedTravel()).rejects.toThrow("TRAVEL_INVALID_RESPONSE");
  });
});
