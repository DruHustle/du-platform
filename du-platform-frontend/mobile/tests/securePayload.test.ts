import { beforeEach, describe, expect, it, vi } from "vitest";
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => storage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { storage.set(key, value); },
  deleteItemAsync: async (key: string) => { storage.delete(key); },
}));
import { deleteSecurePayload, readSecurePayload, saveSecurePayload } from "../src/securePayload";
import * as SecureStore from "expo-secure-store";
import { sessionLifecycle } from "../src/sessionLifecycle";
beforeEach(() => { vi.restoreAllMocks(); storage.clear(); });
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
  it("removes the old trailing chunks when replacing a longer private payload", async () => {
    await saveSecurePayload("pending", "private data ".repeat(100));
    expect(storage.has("pending.2")).toBe(true);
    await saveSecurePayload("pending", "short replacement");
    expect(await readSecurePayload("pending")).toBe("short replacement");
    expect(storage.has("pending.1")).toBe(false);
    expect(storage.has("pending.2")).toBe(false);
    await deleteSecurePayload("pending");
    expect(storage.size).toBe(0);
  });
  it("cleans up an interrupted write before a request is sent", async () => {
    storage.set("pending", "writing:v1:2"); storage.set("pending.0", "private");
    expect(await readSecurePayload("pending")).toBeNull();
    expect(storage.size).toBe(0);
  });
  it("waits for every old chunk deletion after a failure before a new account writes", async () => {
    storage.set("pending", "chunks:v1:2"); storage.set("pending.0", "old"); storage.set("pending.1", "old");
    let unblock!: () => void; let began!: () => void;
    const started = new Promise<void>(resolve => { began = resolve; });
    const blocked = new Promise<void>(resolve => { unblock = resolve; });
    vi.spyOn(SecureStore, "deleteItemAsync").mockImplementation(async key => {
      if (key === "pending.0") throw new Error("keychain unavailable");
      if (key === "pending.1") { began(); await blocked; }
      storage.delete(key);
    });
    const lifecycle = sessionLifecycle();
    const oldCleanup = lifecycle.clearStorage(() => deleteSecurePayload("pending")).catch(error => error);
    await started;
    const version = lifecycle.begin();
    const newWrite = lifecycle.storage(version, async () => { storage.set("pending.1", "new account data"); });
    unblock();
    expect(await oldCleanup).toMatchObject({ message: "keychain unavailable" });
    await newWrite;
    expect(storage.get("pending.1")).toBe("new account data");
  });
});
