import { describe, expect, it } from "vitest";
import { getSpaDocumentStatus } from "../../server";
import { resolveRouteSeo } from "../../contracts/routeSeo";

describe("SPA document fallback", () => {
  it("returns 200 for a registered public route", () => {
    const seo = resolveRouteSeo({ pathname: "/investment" });
    expect(getSpaDocumentStatus(seo.canonicalPath)).toBe(200);
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
    expect(getSpaDocumentStatus(seo.canonicalPath)).toBe(404);
  });
});
