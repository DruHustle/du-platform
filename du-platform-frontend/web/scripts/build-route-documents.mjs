import { loadCatalogue } from "./lib/catalogue.mjs";
import { ORDER_STATUS_PAGE_MARKER } from "../src/domain/orderStatusProtocol.ts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicPagePreview } from "../src/components/PublicPagePreview.tsx";
import fs from "node:fs";
import path from "node:path";
import {
  injectSeoIntoHtml,
  resolveCanonicalUrl,
  resolveRouteSeo,
  PUBLIC_SITE_ORIGIN,
} from "../src/domain/routeSeo.ts";
import { createSitemap, readSiteRoutes } from "./lib/site-routes.mjs";

const output = path.resolve("dist");
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

const products = await loadCatalogue();
fs.writeFileSync(
  path.join(output, "catalogue-index.json"),
  JSON.stringify(products)
);
const { paths } = readSiteRoutes();
for (const pathname of paths) {
  const seo = resolveRouteSeo({
    pathname,
    product: products.find(p => pathname === `/shop/product/${p.slug}`),
  });
  if (pathname !== "/404" && seo.canonicalPath === "/404") {
    throw new Error(`Missing SEO definition for ${pathname}`);
  }
  const target = path.join(
    output,
    pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const preview = renderToStaticMarkup(
    React.createElement(PublicPagePreview, { pathname, products })
  );
  const hero =
    pathname === "/" || pathname === "/travel"
      ? "/images/pages/tourism/victoria_falls.webp"
      : pathname === "/shop"
        ? "/images/pages/shop/crafts_binga_baskets_01.jpg"
        : pathname === "/technology"
          ? "/images/pages/technology/ai_innovation.webp"
          : pathname === "/investment"
            ? "/images/pages/investment/horticulture.jpg"
            : products.find(p => pathname === `/shop/product/${p.slug}`)
                ?.image_url;
  const routeTemplate = template.replace(
    /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
    hero
      ? `<link rel="preload" as="image" href="${hero.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch])}" fetchpriority="high">`
      : ""
  );
  let document = injectSeoIntoHtml(routeTemplate, seo, siteUrl).replace(
    /<div id="root">[\s\S]*<\/div>(\s*<\/body>)/,
    `<div id="root">${preview}</div>$1`
  );
  if (pathname === "/shop/order-status")
    document = document.replace(
      "</head>",
      `<meta ${ORDER_STATUS_PAGE_MARKER}>\n</head>`
    );
  fs.writeFileSync(target, document);
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
