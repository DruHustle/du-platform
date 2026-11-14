import { describe, expect, it } from "vitest";
import { businessGuideLink, navigationPath, travelLink } from "../src/links";
describe("account deep links", () => {
  it.each(["/onesa", "onesa/", "/technology?lng=sn"])("opens Onesa for %s", path => {
    expect(navigationPath(path)).toBe("onesa-ai-chat");
  });
  it("preserves the individual web guide and legacy project record", () => {
    for (const [path,title] of [["/business-guides/farming?lng=sn", "Farming and food production guide"],
      ["/investment#farming", "Farming and food production guide"], ["/investment/projects/horticulture", "Project profile"],
      ["/ntir?q=farmer","Business directory"]]) {
      expect(businessGuideLink(path)).toEqual({path, title});
    }
    expect(businessGuideLink("/investment-fake")).toBeUndefined();
  });
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
