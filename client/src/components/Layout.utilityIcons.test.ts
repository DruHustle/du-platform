import { describe, expect, it } from "vitest";
import { getDesktopUtilityIconsClass } from "./Layout";

describe("getDesktopUtilityIconsClass", () => {
  it("uses edge icon column when overlap is detected", () => {
    const cls = getDesktopUtilityIconsClass(true);
    expect(cls).toContain("lg:fixed");
    expect(cls).toContain("lg:top-2");
    expect(cls).toContain("lg:flex-col");
  });

  it("uses original horizontal position when there is no overlap", () => {
    const cls = getDesktopUtilityIconsClass(false);
    expect(cls).toContain("flex");
    expect(cls).toContain("items-center");
    expect(cls).not.toContain("lg:fixed");
  });
});
