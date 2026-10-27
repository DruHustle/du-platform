import { describe, expect, it } from "vitest";
import {
  injectSeoIntoHtml,
  PUBLIC_SITE_ORIGIN,
  resolveCanonicalUrl,
  resolveRouteSeo,
} from "../../../shared/routeSeo";

describe("canonical URL policy", () => {
  it.each([
    "https://diasporaunlocked.com",
    "https://www.diasporaunlocked.com/",
    "http://diasporaunlocked.com",
    "http://www.diasporaunlocked.com/",
  ])("normalizes public domain %s to HTTPS www", origin => {
    expect(resolveCanonicalUrl(origin, "/travel")).toBe(
      `${PUBLIC_SITE_ORIGIN}/travel`
    );
  });

  it("preserves a configured local origin", () => {
    expect(resolveCanonicalUrl("http://localhost:5016/", "/shop")).toBe(
      "http://localhost:5016/shop"
    );
  });

  it("canonicalizes tracking parameters and trailing slashes without losing the page", () => {
    const seo = resolveRouteSeo({
      pathname: "/tourism/",
      search: "?utm_source=google",
    });
    expect(seo.canonicalPath).toBe("/travel");
    expect(seo.robots).toBe("index,follow");
  });

  it("uses the actual project name rather than its legacy route ID", () => {
    const seo = resolveRouteSeo({ pathname: "/investment/projects/leather" });
    expect(seo.title).toBe(
      "Linkdef Soap Manufacturing Project | Diaspora Unlocked"
    );
    expect(seo.canonicalPath).toBe("/investment/projects/leather");
  });

  it.each([
    "/investment/projects/unknown",
    "/investment/projects/__proto__",
    "/investment/projects/masuwe/extra",
  ])("does not index an unknown project: %s", pathname => {
    const seo = resolveRouteSeo({ pathname });
    expect(seo.canonicalPath).toBe("/404");
    expect(seo.robots).toBe("noindex,nofollow");
  });

  it("keeps product-interest preference links private and out of indexing", () => {
    const seo = resolveRouteSeo({
      pathname: "/shop/interest",
      search: "?lng=de",
    });
    expect(seo.robots).toBe("noindex,nofollow");
    expect(seo.canonicalPath).toBe("/shop/interest");
  });
  it("updates initial HTML metadata consistently and escapes search text", () => {
    const template =
      '<title>Home</title><meta name="description" content="Home"><meta name="robots" content="index,follow"><meta property="og:title" content="Home"><meta property="og:url" content="https://diasporaunlocked.com/"><link rel="canonical" href="https://diasporaunlocked.com/"><h1 class="seo-h1">Home</h1>';
    const seo = resolveRouteSeo({
      pathname: "/search",
      search: "?q=%3Cscript%3E%26%22",
    });
    const html = injectSeoIntoHtml(
      template,
      seo,
      "https://diasporaunlocked.com"
    );
    expect(html).toContain(`href="${PUBLIC_SITE_ORIGIN}/search"`);
    expect(html).toContain('content="noindex,follow"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;&amp;&quot;");
    expect(html.match(/rel="canonical"/g)).toHaveLength(1);
  });
});
