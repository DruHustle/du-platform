import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../public/theme-init.js", import.meta.url), "utf8");

describe("retired theme preference", () => {
  it.each(["dark", "light", "system"])("removes %s and preserves unrelated settings", preference => {
    const stored = new Map([["theme", preference], ["language", "sn"], ["reduce-motion", "true"]]);
    runInNewContext(source, { localStorage: { removeItem: (key: string) => stored.delete(key) } });
    expect([...stored]).toEqual([["language", "sn"], ["reduce-motion", "true"]]);
  });
  it("works when storage is unavailable", () => {
    expect(() => runInNewContext(source, {})).not.toThrow();
  });
});
