import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../../../..", import.meta.url)));
import { PASSWORD_RESET_PAGE_MARKER } from "../../../../du-platform-frontend/web/src/domain/passwordResetProtocol.ts";
import { readSiteRoutes } from "../../../../du-platform-frontend/web/scripts/lib/site-routes.mjs";
import { assertActiveFrontendApi } from "../lib/frontend-api-origin.mjs";
import {
  PUBLIC_SITE_ORIGIN,
  resolveCanonicalUrl,
  resolveRouteSeo,
} from "../../../../du-platform-frontend/web/src/domain/routeSeo.ts";

const root = path.resolve("du-platform-frontend/web/dist");
assert(
  fs
    .readFileSync(path.join(root, "reset-password.html"), "utf8")
    .includes(PASSWORD_RESET_PAGE_MARKER),
  "Reset page must advertise private fragment-link compatibility"
);
const homeHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(
  homeHtml.includes("/images/brand/diaspora_unlocked_336.webp"),
  "Initial Home HTML must use the display-sized brand image"
);
assert(
  fs.statSync(path.join(root, "images/brand/diaspora_unlocked_336.webp"))
    .size <= 32768,
  "The critical brand image must stay within its measured 32 KiB budget"
);
const { paths, redirects } = readSiteRoutes();
assert(paths.includes("/admin"), "Preserve the protected admin document route");
const config = JSON.parse(fs.readFileSync("du-platform-frontend/web/vercel.json", "utf8"));
// Native normalization precedes custom redirects on Vercel and creates legacy
// Travel chains. Explicit rules preserve clean public URLs after legacy aliases.
assert.equal(config.cleanUrls, false);
assert.equal(config.trailingSlash, undefined);
assert(
  config.redirects.some(
    r =>
      r.source === "/:path([^/].*).html" &&
      r.destination === "/:path" &&
      r.permanent
  )
);
assert(
  config.redirects.some(
    r =>
      r.source === "/:path([^/].*)/" &&
      r.destination === "/:path" &&
      r.permanent
  )
);
const languageQuery = [{ type: "query", key: "lng", value: "(?<locale>de|sn|nd)" }];
assert.deepEqual(config.rewrites, [
  {
    source: "/api/:path*",
    destination: process.env.VERCEL_ENV === "preview"
      ? "/preview-api-unavailable.json" : "https://du-platform-api.onrender.com/api/:path*",
  },
  { source: "/", has: languageQuery, destination: "/page-locales/:locale/index.html" },
  { source: "/", destination: "/page-locales/en/index.html" },
  { source: "/:path([^/.][^.]*)", has: languageQuery, destination: "/page-locales/:locale/:path.html" },
  { source: "/:path([^/.][^.]*)", destination: "/:path.html" },
  { source: "/shop/product/:slug", has: languageQuery, destination: "/page-locales/:locale/shop/products.html" },
  { source: "/shop/product/:slug", destination: "/shop/products.html" },
]);
const entryAssets = [
  ...fs
    .readFileSync(path.join(root, "index.html"), "utf8")
    .matchAll(/<script\b[^>]*src="(\/assets\/[^"?]+\.js)"/g),
].map(match => match[1]);
assert(
  entryAssets.length > 0,
  "Production HTML must load a browser entry bundle"
);
for (const filename of fs
  .readdirSync(path.join(root, "assets"))
  .filter(name => name.endsWith(".js"))) {
  const asset = `/assets/${filename}`;
  assertActiveFrontendApi(
    fs.readFileSync(path.join(root, asset), "utf8"),
    asset
  );
}
for (const redirect of redirects) {
  assert(
    config.redirects.some(
      rule =>
        rule.source === redirect.source &&
        rule.destination === redirect.destination &&
        rule.permanent
    )
  );
}
assert(
  config.redirects.some(
    rule =>
      rule.source === "/index.html" &&
      rule.destination === "/" &&
      rule.permanent
  )
);

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  match => match[1]
);
assert.equal(locations.length, new Set(locations).size);
const origin = new URL(locations[0]).origin;
if (origin.includes("diasporaunlocked.com"))
  assert.equal(origin, PUBLIC_SITE_ORIGIN);
const expectedLocations = [];
for (const pathname of paths) {
  const file = pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const products = JSON.parse(
    fs.readFileSync(path.join(root, "catalogue-index.json"), "utf8")
  );
  const seo = resolveRouteSeo({
    pathname,
    product: products.find(p => pathname === `/shop/product/${p.slug}`),
  });
  const canonical = resolveCanonicalUrl(origin, seo.canonicalPath);
  assert.equal(
    [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/gi)].length,
    1,
    pathname
  );
  assert(
    html.includes(`href="${canonical}"`),
    `${pathname}: initial canonical must match its route`
  );
  assert(
    html.includes(`content="${seo.robots}"`),
    `${pathname}: robots policy`
  );
  assert(
    html.includes(`content="${canonical}"`),
    `${pathname}: social URL must match`
  );
  const titleEntities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
  };
  const documentTitle = html
    .match(/<title>([\s\S]*?)<\/title>/i)?.[1]
    .replace(/&(?:amp|lt|gt|quot|#39);/g, entity => titleEntities[entity]);
  assert.equal(documentTitle, seo.title, `${pathname}: title`);
  assert(
    html.includes('id="root"'),
    `${pathname}: retain React application shell`
  );
  for (const asset of html.matchAll(
    /<script\b[^>]*src="(\/assets\/[^"?]+)"/g
  )) {
    assert(
      fs.existsSync(path.join(root, asset[1])),
      `${pathname}: missing app asset`
    );
  }
  if (seo.robots === "index,follow" && seo.canonicalPath === pathname) expectedLocations.push(canonical);
  console.log(`PASS initial HTML ${pathname}`);
}
const products = JSON.parse(fs.readFileSync(path.join(root, "catalogue-index.json"), "utf8"));
for (const [language, ogLocale] of [["de","de_DE"], ["sn","sn_ZW"], ["nd","nd_ZW"]]) {
  const translations = JSON.parse(fs.readFileSync(path.join(root, "locales", language, "translation.json"), "utf8"));
  for (const pathname of paths) {
    const file = pathname === "/" ? "index.html" : pathname.slice(1) + ".html";
    const html = fs.readFileSync(path.join(root, "page-locales", language, file), "utf8");
    const seo = resolveRouteSeo({ pathname });
    assert(html.includes(`<html lang="${language}">`), pathname);
    assert(html.includes(`<meta property="og:locale" content="${ogLocale}"`), pathname);
    assert(html.includes(`<link rel="canonical" href="${resolveCanonicalUrl(origin, seo.canonicalPath)}"`), pathname);
    assert(html.includes(`<meta name="robots" content="${seo.robots}"`), pathname);
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    assert(title && description, pathname);
    for (const [field, value] of [["title", title], ["description", description]]) {
      assert(html.includes(`<meta property="og:${field}" content="${value}"`), pathname);
      assert(html.includes(`<meta name="twitter:${field}" content="${value}"`), pathname);
    }
    const text = html.replace(/&(?:amp|quot|lt|gt|#39|#x27);/g,
      entity => ({ "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&#39;": "'", "&#x27;": "'" })[entity]);
    if (pathname === "/") assert(text.includes(translations.home.hero_title) && html.includes(`/travel/flights?lng=${language}`));
    if (pathname === "/care") assert(text.includes(translations.care.funeral));
    if (pathname === "/business-guides/farming") assert(text.includes(translations.investment.opportunities.farming.title));
    if (pathname === "/shop/order-status") assert(html.includes('name="du-order-status-version" content="1"'));
    const product = products.find(p => `/shop/product/${p.slug}` === pathname);
    if (product) {
      const expected = (product.translation_key && translations.shop.products.descriptions[product.slug]) || product.description;
      const unescaped = description.replace(/&(?:amp|quot|lt|gt|#39);/g,
        entity => ({ "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&#39;": "'" })[entity]);
      assert.equal(unescaped, expected, pathname);
    }
  }
}
assert.equal(fs.readFileSync(path.join(root, "page-locales/en/index.html"), "utf8"), homeHtml);
assert.deepEqual(
  [...locations].sort(),
  expectedLocations.sort(),
  "Sitemap must contain all and only indexable routes"
);
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
assert(robots.startsWith("User-agent: *\nAllow: /\n"));
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert(
  !sitemap.includes("<lastmod>"),
  "Do not invent page modification dates on every release"
);
console.log(
  `PASS ${paths.length} route documents; ${locations.length} canonical sitemap URLs; robots and static-hosting configuration`
);

for (const [route, promise] of [
  ["/", 'href="/travel/stays"'],
  ["/shop", "one-time email alert"],
  ["/shop/products", "email alert"],
  ["/travel", 'href="/travel/flights"'],
  ["/care", "funeral costs for a relative in Zimbabwe"],
  ["/business-guides", 'href="/ntir"'],
  ["/onesa", 'href="/travel/planner?example=victoria-falls-3-days"'],
]) {
  const file = route === "/" ? "index.html" : route.slice(1) + ".html";
  const html = fs.readFileSync(path.join(root, file), "utf8");
  assert(html.includes("public-preview"), `${route} needs substantive initial content`);
  assert(!html.includes("Loading Diaspora Unlocked"), `${route} must not contain the loading shell`);
  assert(html.includes(promise), `${route} initial HTML must include ${promise}`);
}

assert(
  !fs
    .readFileSync(path.join(root, "index.html"), "utf8")
    .includes("fonts.googleapis.com"),
  "Font styles must not block rendering on a third party"
);
for (const family of ["inter", "montserrat"]) {
  assert(
    fs.existsSync(path.join(root, "fonts", `${family}-OFL.txt`)),
    "Preserve font redistribution notices"
  );
  assert(
    fs.existsSync(path.join(root, "fonts", `${family}-latin.woff2`)),
    "Ship the actual brand fonts"
  );
}

assert(
  fs
    .readFileSync(path.join(root, "shop/order-status.html"), "utf8")
    .includes('name="du-order-status-version" content="1"'),
  "Publish the frontend compatibility marker before customer email links are released"
);

for (const route of ["legal-notice", "delivery-and-returns"]) {
  const html = fs.readFileSync(path.join(root, route + ".html"), "utf8");
  assert(
    html.includes("DHL delivery is planned from Germany") && html.includes("info@diasporaunlocked.com"),
    "Customers can read delivery plans and reach the shop in the initial HTML"
  );
  assert(
    html.includes('content="noindex,follow"'),
    "Unapproved policy drafts stay noindex"
  );
}
