import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
const source = readFileSync(
  new URL("../../public/theme-init.js", import.meta.url),
  "utf8"
);
function bootstrap(
  stored: string | null,
  systemDark: boolean,
  blocked = false,
  supported = true
) {
  const classes = new Set<string>();
  const dataset: Record<string, string> = {};
  let toolbar = "";
  runInNewContext(source, {
    window: {
      get localStorage() {
        if (blocked) throw new Error("Storage blocked");
        return { getItem: () => stored };
      },
      matchMedia: supported ? () => ({ matches: systemDark }) : undefined,
    },
    document: {
      documentElement: {
        dataset,
        classList: {
          toggle: (name: string, enabled: boolean) =>
            enabled ? classes.add(name) : classes.delete(name),
        },
      },
      querySelector: () => ({
        setAttribute: (_name: string, value: string) => {
          toolbar = value;
        },
      }),
    },
  });
  return {
    dark: classes.has("dark"),
    preference: dataset.themePreference,
    toolbar,
  };
}
describe("first-paint appearance", () => {
  it("follows the browser by default without saving its resolved colour as a manual override", () => {
    expect(bootstrap(null, true)).toEqual({
      dark: true,
      preference: "system",
      toolbar: "#0f172a",
    });
    expect(bootstrap(null, false)).toEqual({
      dark: false,
      preference: "system",
      toolbar: "#f8fafb",
    });
  });
  it("honours explicit light and dark choices over the browser", () => {
    expect(bootstrap("light", true).dark).toBe(false);
    expect(bootstrap("dark", false).dark).toBe(true);
  });
  it("keeps system mode automatic and rejects invalid stored preferences", () => {
    expect(bootstrap("system", true).preference).toBe("system");
    expect(bootstrap("invalid", true)).toEqual(bootstrap(null, true));
  });
  it("works when browser storage is denied or colour preferences are unsupported", () => {
    expect(bootstrap(null, true, true).dark).toBe(true);
    expect(bootstrap(null, true, false, false).dark).toBe(false);
  });
});
