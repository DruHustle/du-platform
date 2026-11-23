import { describe, expect, it } from "vitest";
import { keyboardBottomInset } from "../src/keyboardLayout";

describe("Android keyboard clearance", () => {
  it("reserves the actual overlap observed in the large-text tablet capture", () => {
    // Run 41765883784: outer viewport [89,138][1920,1200], IME top=720.
    expect(keyboardBottomInset({ y: 138, height: 1062 }, 720)).toBe(480);
    // Native layout reports the same geometry in density-independent units.
    expect(keyboardBottomInset({ y: 92, height: 708 }, 480)).toBe(320);
  });

  it("does not add keyboard padding to an already resized window", () => {
    expect(keyboardBottomInset({ y: 138, height: 582 }, 720)).toBe(0);
    expect(keyboardBottomInset({ y: 138, height: 500 }, 720)).toBe(0);
  });

  it("uses the current viewport instead of a fixed header or full keyboard height", () => {
    expect(keyboardBottomInset({ y: 200, height: 700 }, 720)).toBe(180);
    expect(keyboardBottomInset({ y: 185, height: 1735 }, 1200)).toBe(720);
    expect(keyboardBottomInset({ y: 138, height: 1062 }, 720)).toBe(480);
  });

  it("clears on hide and ignores unavailable layout measurements", () => {
    expect(keyboardBottomInset({ y: 138, height: 1062 })).toBe(0);
    expect(keyboardBottomInset({ y: 0, height: 0 }, 720)).toBe(0);
    expect(keyboardBottomInset({ y: Number.NaN, height: 1062 }, 720)).toBe(0);
    expect(keyboardBottomInset({ y: 138, height: 1062 }, Number.NaN)).toBe(0);
    expect(keyboardBottomInset({ y: 138, height: 1062 }, 0)).toBe(1062);
  });
});
