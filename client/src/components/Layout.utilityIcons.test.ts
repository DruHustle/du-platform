import { describe, expect, it } from "vitest";
import { getDesktopUtilityIconsClass } from "./Layout";

describe("getDesktopUtilityIconsClass", () => {
  it("uses right-edge icon column for typical desktop widths", () => {
    const widths = [1024, 1280, 1366, 1440, 1600];
    for (const width of widths) {
      const cls = getDesktopUtilityIconsClass(width);
      expect(cls).toContain("lg:absolute");
      expect(cls).toContain("lg:right-0");
      expect(cls).toContain("lg:flex-col");
    }
  });

  it("uses horizontal utility row for wide desktop widths", () => {
    const widths = [1680, 1920, 2560];
    for (const width of widths) {
      const cls = getDesktopUtilityIconsClass(width);
      expect(cls).toContain("lg:flex-row");
      expect(cls).not.toContain("lg:absolute");
    }
  });

  it("returns empty for non-desktop widths", () => {
    const widths = [320, 768, 900, 1000];
    for (const width of widths) {
      expect(getDesktopUtilityIconsClass(width)).toBe("");
    }
  });
});

