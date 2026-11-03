import { describe, expect, it } from "vitest";
import { resolveRouteSeo } from "../domain/routeSeo";

describe("SPA document fallback", () => {
  it("returns 200 for a registered public route", () => {
    const seo = resolveRouteSeo({ pathname: "/investment" });
    expect(seo.canonicalPath === "/404" ? 404 : 200).toBe(200);
  });

  it.each([
    "/care",
    "/trade",
    "/remittances",
    "/payments",
    "/not-a-real-route",
    "/investment/projects/unknown",
  ])("returns 404 for %s", pathname => {
    const seo = resolveRouteSeo({ pathname });
    expect(seo.robots).toBe("noindex,nofollow");
    expect(seo.canonicalPath === "/404" ? 404 : 200).toBe(404);
  });
});
