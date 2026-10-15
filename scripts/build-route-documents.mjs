import fs from "node:fs";
import path from "node:path";
import {
  injectSeoIntoHtml,
  resolveCanonicalUrl,
  resolveRouteSeo,
  PUBLIC_SITE_ORIGIN,
} from "../shared/routeSeo.ts";
import { createSitemap, readSiteRoutes } from "./lib/site-routes.mjs";

const output = path.resolve("dist/public");
const template = fs.readFileSync(path.join(output, "index.html"), "utf8");
// Use the origin already resolved by Vite, including its build-time environment.
const templateOrigin = template.match(
  /<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i
)?.[1];
if (!templateOrigin) throw new Error("Built HTML is missing its canonical URL");
const siteUrl = resolveCanonicalUrl(
  templateOrigin.replace(/\/+$/, ""),
  "/"
).replace(/\/+$/, "");
if (new URL(siteUrl).hostname === "localhost") {
  throw new Error("Production HTML must not point search engines at localhost");
}

const { paths } = readSiteRoutes();
for (const pathname of paths) {
  const seo = resolveRouteSeo({ pathname });
  if (pathname !== "/404" && seo.canonicalPath === "/404") {
    throw new Error(`Missing SEO definition for ${pathname}`);
  }
  const target = path.join(
    output,
    pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, injectSeoIntoHtml(template, seo, siteUrl));
}
// Vercel serves this document with HTTP 404 for unmatched paths. React still
// renders the requested URL, retaining the existing branded error experience.
if (!paths.includes("/404")) throw new Error("Missing 404 route");
fs.writeFileSync(
  path.join(output, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    `Sitemap: ${resolveCanonicalUrl(siteUrl || PUBLIC_SITE_ORIGIN, "/sitemap.xml")}`,
    "",
  ].join("\n")
);
fs.writeFileSync(path.join(output, "sitemap.xml"), createSitemap(siteUrl));
console.log(
  `[seo] Built ${paths.length} route documents and robots.txt for ${siteUrl}`
);
