import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
const storage = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("keeps the same unresolved command after a lost response and reload without storing financial details", async () => {
  let helper = await import("./orderCommandAttempt");
  const payload = {
    version: 3,
    action: "refund",
    refundCents: 450,
    refundReference: "PRIVATE-REFERENCE",
    note: "Private customer note",
  };
  const a = await helper.prepareOrderCommand("admin:DU-TEST", payload);
  expect(
    (await helper.prepareOrderCommand("admin:DU-TEST", payload)).requestId
  ).toBe(a.requestId);
  expect([...storage.values()].join()).not.toMatch(
    /PRIVATE|Private customer|refundCents|refundReference/
  );
  vi.resetModules();
  helper = await import("./orderCommandAttempt");
  expect(
    (await helper.prepareOrderCommand("admin:DU-TEST", payload)).requestId
  ).toBe(a.requestId);
  expect(
    (
      await helper.prepareOrderCommand("admin:DU-TEST", {
        ...payload,
        refundCents: 500,
      })
    ).requestId
  ).not.toBe(a.requestId);
});
it("reconciles committed admin payment and customer acceptance before clearing attempts", async () => {
  const h = await import("./orderCommandAttempt");
  for (const action of ["payment_confirmed", "quote_accepted"]) {
    const a = await h.prepareOrderCommand(action, { version: 3, action });
    expect(h.reconcileOrderCommand(action, { version: 3, history: [] })).toBe(
      "unresolved"
    );
    expect(
      h.reconcileOrderCommand(action, {
        version: 4,
        history: [
          {
            request_id: action === "payment_confirmed" ? a.requestId : null,
            command_id: action === "quote_accepted" ? a.requestId : null,
            action,
          },
        ],
      })
    ).toBe("applied");
    expect(h.pendingOrderCommand(action)).toBeNull();
  }
});
it("rejects stale assumptions after another command and retains safe retry support when storage is blocked", async () => {
  const h = await import("./orderCommandAttempt");
  vi.stubGlobal("window", {
    get sessionStorage() {
      throw new Error("blocked");
    },
  });
  const payload = { version: 5, action: "payment_confirmed" };
  const a = await h.prepareOrderCommand("admin:DU-BLOCKED", payload);
  expect(
    (await h.prepareOrderCommand("admin:DU-BLOCKED", payload)).requestId
  ).toBe(a.requestId);
  expect(
    h.reconcileOrderCommand("admin:DU-BLOCKED", {
      state: { version: 6 },
      history: [],
    })
  ).toBe("changed");
  expect(h.pendingOrderCommand("admin:DU-BLOCKED")).toBeNull();
});
