import { describe, expect, it } from "vitest";
import { resolveRouteSeo } from "../domain/routeSeo";

describe("SPA document fallback", () => {
  it.each(["/care", "/business-guides", "/investment"])(
    "returns 200 for %s",
    (pathname) => {
      const seo = resolveRouteSeo({ pathname });
      expect(seo.canonicalPath === "/404" ? 404 : 200).toBe(200);
    },
  );

  it.each([
    "/trade",
    "/remittances",
    "/payments",
    "/not-a-real-route",
    "/investment/projects/unknown",
    "/business-guides/unknown",
  ])("returns 404 for %s", (pathname) => {
    const seo = resolveRouteSeo({ pathname });
    expect(seo.robots).toBe("noindex,nofollow");
    expect(seo.canonicalPath === "/404" ? 404 : 200).toBe(404);
  });
});
