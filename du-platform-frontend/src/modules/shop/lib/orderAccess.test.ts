import { expect, it, vi } from "vitest";
import { consumeOrderAccessFragment, getOrderAccessGrant } from "./orderAccess";
it("consumes a private email fragment before telemetry and removes it from the URL", () => {
  const replaceState = vi.fn();
  vi.stubGlobal("window", {
    location: {
      pathname: "/shop/order-status",
      hash: `#ref=DU-FIXTURE&access=${"a".repeat(64)}`,
    },
    history: { replaceState },
  });
  consumeOrderAccessFragment();
  expect(getOrderAccessGrant()).toEqual({
    orderRef: "DU-FIXTURE",
    token: "a".repeat(64),
  });
  expect(replaceState).toHaveBeenCalledWith(null, "", "/shop/order-status");
  vi.unstubAllGlobals();
});

it("retains a private grant for a same-tab refresh without keeping it in the URL", async () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    location: {
      pathname: "/shop/order-status",
      hash: `#ref=DU-REFRESH&access=${"b".repeat(64)}`,
    },
    history: { replaceState: vi.fn() },
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
  consumeOrderAccessFragment();
  (window.location as any).hash = "";
  vi.resetModules();
  const fresh = await import("./orderAccess");
  fresh.consumeOrderAccessFragment();
  expect(fresh.getOrderAccessGrant()).toEqual({
    orderRef: "DU-REFRESH",
    token: "b".repeat(64),
  });
  vi.unstubAllGlobals();
});
