import { describe, expect, it } from "vitest";
import { navigationPath, travelLink } from "../src/links";
describe("account deep links", () => {
  it("accepts a reset token from the email fragment", () => {
    expect(navigationPath("reset-password#token=abc123")).toBe("reset-password?token=abc123");
    expect(navigationPath("reset-password?next=account#token=abc123")).toBe("reset-password?next=account&token=abc123");
  });
  it("does not interpret fragments on unrelated content", () => {
    expect(navigationPath("travel#token=abc123")).toBe("travel#token=abc123");
  });
  it("opens the requested native research tab or offers a safe website handoff", () => {
    expect(travelLink("stays")).toEqual({category: "stays"});
    expect(travelLink("flights")).toEqual({category: "flights"});
    expect(travelLink("car-hire")).toEqual({website: "/travel/car-hire"});
    expect(travelLink("weather")).toEqual({website: "/travel/weather"});
    expect(travelLink("//evil.example")).toEqual({website: "/travel"});
  });
});
