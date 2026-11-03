import { afterEach, describe, expect, it, vi } from "vitest";
import { safeLocalStorage, safeSessionStorage } from "./browserStorage";

afterEach(() => vi.unstubAllGlobals());

describe("optional browser storage", () => {
  it("does not interrupt rendering or requests when storage access is denied", () => {
    const blocked = {
      get localStorage() {
        throw new Error("SecurityError");
      },
      get sessionStorage() {
        throw new Error("SecurityError");
      },
    };
    vi.stubGlobal("window", blocked);
    for (const storage of [safeLocalStorage, safeSessionStorage]) {
      expect(storage.getItem("key")).toBeNull();
      expect(() => storage.setItem("key", "value")).not.toThrow();
      expect(() => storage.removeItem("key")).not.toThrow();
    }
  });

  it("preserves normal reads, writes and removal", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    safeLocalStorage.setItem("theme", "dark");
    expect(safeLocalStorage.getItem("theme")).toBe("dark");
    safeLocalStorage.removeItem("theme");
    expect(safeLocalStorage.getItem("theme")).toBeNull();
  });
});
