import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
const storage = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("contact request recovery", () => {
  const payload = {
    name: "Private fixture",
    email: "private@example.test",
    message: "Private synthetic enquiry",
  };
  it("retains a stable opaque request ID across a lost response and reload without storing contact details", async () => {
    const first = await import("./contactAttempt");
    const id = await first.prepareContactAttempt(payload);
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(await first.prepareContactAttempt(payload)).toBe(id);
    vi.resetModules();
    const afterReload = await import("./contactAttempt");
    expect(await afterReload.prepareContactAttempt(payload)).toBe(id);
    for (const value of Object.values(payload))
      expect([...storage.values()].join("")).not.toContain(value);
  });
  it("requires explicit new intent for a changed unresolved message and allows genuinely repeated enquiries", async () => {
    const module = await import("./contactAttempt");
    const first = await module.prepareContactAttempt(payload);
    await expect(
      module.prepareContactAttempt({ ...payload, message: "Changed" })
    ).rejects.toThrow("CONTACT_MESSAGE_CHANGED");
    module.clearContactAttempt();
    expect(await module.prepareContactAttempt(payload)).not.toBe(first);
  });
  it("survives corrupt or blocked optional storage and retains retry identity in memory", async () => {
    storage.set("du_contact_attempt_v1", "{");
    const module = await import("./contactAttempt");
    const id = await module.prepareContactAttempt(payload);
    vi.stubGlobal("window", {
      get sessionStorage() {
        throw new Error("Blocked");
      },
    });
    expect(await module.prepareContactAttempt(payload)).toBe(id);
  });
});
