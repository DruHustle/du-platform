import { loadCatalogue } from "./lib/catalogue.mjs";
import { ORDER_STATUS_PAGE_MARKER } from "../src/domain/orderStatusProtocol.ts";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicPagePreview } from "../src/components/PublicPagePreview.tsx";
import fs from "node:fs";
import path from "node:path";
import {
  injectSeoIntoHtml,
  localizeRouteSeo,
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
const { paths } = readSiteRoutes(undefined, products);
const locales = ["en", "de", "sn", "nd"].map(language => {
  const copy = JSON.parse(fs.readFileSync(new URL(`../public/locales/${language}/translation.json`, import.meta.url), "utf8"));
  const translate = (key, fallback) => {
    const value = key.split(".").reduce((parent, part) => parent?.[part], copy);
    if (typeof value === "string") return value;
    if (typeof fallback === "string") return fallback;
    throw new Error(`Missing ${language} route copy for ${key}`);
  };
  const catalogue = products.map(product => ({
    ...product,
    description: language !== "en" && product.translation_key
      ? translate(product.translation_key, product.description) : product.description,
  }));
  return { language, copy, translate, catalogue };
});
for (const pathname of paths) {
  const seo = resolveRouteSeo({
    pathname,
    product: products.find(p => pathname === `/shop/product/${p.slug}`),
  });
  if (pathname !== "/404" && seo.canonicalPath === "/404") {
    throw new Error(`Missing SEO definition for ${pathname}`);
  }
  const hero =
    pathname === "/" || pathname === "/travel"
      ? "/images/pages/tourism/victoria_falls.webp"
      : pathname === "/shop"
        ? "/images/pages/shop/crafts_binga_baskets_01.jpg"
        : pathname === "/onesa"
          ? "/images/pages/technology/ai_innovation.webp"
          : pathname === "/business-guides"
            ? "/images/pages/investment/horticulture.jpg"
            : pathname === "/care" ? "/images/pages/care/family-gathering.webp"
              : products.find(p => pathname === `/shop/product/${p.slug}`)?.image_url;
  const routeTemplate = template.replace(
    /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g,
    hero
      ? `<link rel="preload" as="image" href="${hero.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch])}" fetchpriority="high">`
      : ""
  );
  const appRoot = /<div id="root">[\s\S]*<\/div>(?=\s*(?:<script\b[^>]*>[\s\S]*?<\/script>\s*)*<\/body>)/;
  if (!appRoot.test(routeTemplate)) throw new Error("Unable to locate the application root for " + pathname);
  // Snapshot curated descriptions only when the published API explicitly marks
  // them translatable. The editor's current description otherwise stays intact.
  for (const { language, copy, translate, catalogue } of locales) {
    const file = pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
    const target = path.join(output, language === "en" ? "" : `page-locales/${language}`, file);
    const product = catalogue.find(row => pathname === `/shop/product/${row.slug}`);
    const localized = localizeRouteSeo(seo, language, translate, product);
    const preview = renderToStaticMarkup(React.createElement(PublicPagePreview, {
      pathname, products: catalogue, copy, language, seo: localized,
    }));
    let document = injectSeoIntoHtml(routeTemplate, localized, siteUrl, language).replace(
      appRoot, () => `<div id="root">${preview}</div>`
    );
    if (pathname === "/shop/order-status") document = document.replace(
      "</head>", `<meta ${ORDER_STATUS_PAGE_MARKER}>\n</head>`
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, document);
  }
}
// Vercel serves a physical index.html before considering rewrites for "/".
const homeTarget = path.join(output, "page-locales/en/index.html");
fs.mkdirSync(path.dirname(homeTarget), { recursive: true });
fs.copyFileSync(path.join(output, "index.html"), homeTarget);
if (process.env.VERCEL === "1") fs.unlinkSync(path.join(output, "index.html"));
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
fs.writeFileSync(path.join(output, "sitemap.xml"), createSitemap(siteUrl, undefined, products));
console.log(
  `[seo] Built ${paths.length} route documents in ${locales.length} languages and robots.txt for ${siteUrl}`
);
