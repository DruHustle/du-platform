import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
  deleteItemAsync: async (key: string) => { storage.delete(key); },
}));
import { deleteSecurePayload, readSecurePayload, saveSecurePayload } from "../src/securePayload";
beforeEach(() => storage.clear());
describe("secure pending requests", () => {
  it("round-trips a long Unicode payload in small entries and removes all parts", async () => {
    const value = "✈️😀".repeat(1400);
    await saveSecurePayload("pending", value);
    expect(await readSecurePayload("pending")).toBe(value);
    expect([...storage.values()].every(part => new TextEncoder().encode(part).length <= 2000)).toBe(true);
    await deleteSecurePayload("pending");
    expect(storage.size).toBe(0);
  });
  it("rejects incomplete requests and reads legacy entries", async () => {
    storage.set("pending", "chunks:v1:2"); storage.set("pending.0", "first");
    await expect(readSecurePayload("pending")).rejects.toThrow("incomplete");
    storage.set("pending", "legacy");
    expect(await readSecurePayload("pending")).toBe("legacy");
  });
  it("cleans up an interrupted write before a request is sent", async () => {
    storage.set("pending", "writing:v1:2"); storage.set("pending.0", "private");
    expect(await readSecurePayload("pending")).toBeNull();
    expect(storage.size).toBe(0);
  });
});
