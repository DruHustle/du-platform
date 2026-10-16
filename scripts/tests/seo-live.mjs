import assert from "node:assert/strict";
import {
  assertActiveFrontendApi,
  referencedFrontendScripts,
} from "../lib/frontend-api-origin.mjs";

// Read-only release smoke check. Fetching raw HTML deliberately does not execute
// JavaScript, so client-side metadata updates cannot hide hosting regressions.
const base = (
  process.env.SEO_BASE_URL || "https://www.diasporaunlocked.com"
).replace(/\/+$/, "");
const canonicalOrigin =
  process.env.SEO_CANONICAL_ORIGIN || "https://www.diasporaunlocked.com";
const read = async pathname => {
  const response = await fetch(base + pathname, {
    redirect: "manual",
    signal: AbortSignal.timeout(30000),
  });
  return { response, html: await response.text() };
};
function checkDocument(html, pathname, indexable) {
  const tags = [
    ...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/gi),
  ];
  assert.equal(tags.length, 1, `${pathname}: exactly one canonical`);
  assert.equal(
    tags[0][1],
    canonicalOrigin + pathname,
    `${pathname}: initial canonical`
  );
  const robots = html.match(
    /<meta\b[^>]*name="robots"[^>]*content="([^"]+)"/i
  )?.[1];
  assert.equal(
    robots?.split(",")[0],
    indexable ? "index" : "noindex",
    `${pathname}: robots`
  );
  assert(html.includes('id="root"'), `${pathname}: app shell`);
}

const { response: sitemapResponse, html: sitemap } = await read("/sitemap.xml");
assert.equal(sitemapResponse.status, 200);
assert(sitemap.includes("<urlset"), "Sitemap must be XML, not SPA HTML");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  match => new URL(match[1])
);
assert.equal(urls.length, new Set(urls.map(url => url.href)).size);
for (const pathname of [
  "/",
  "/shop",
  "/shop/products",
  "/tourism",
  "/technology",
  "/investment",
  "/investment/opportunities",
  "/investment/projects/masuwe",
]) {
  assert(
    urls.some(url => url.pathname === pathname),
    `${pathname}: missing sitemap entry`
  );
}
for (const url of urls) {
  assert.equal(url.origin, canonicalOrigin);
  const { response, html } = await read(url.pathname);
  assert.equal(response.status, 200, url.pathname);
  checkDocument(html, url.pathname, true);
  console.log(`PASS canonical ${url.pathname}`);
}
for (const pathname of [
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/search",
]) {
  const { response, html } = await read(pathname);
  assert.equal(response.status, 200, pathname);
  checkDocument(html, pathname, false);
  assert(!urls.some(url => url.pathname === pathname));
}
for (const pathname of [
  "/no-such-indexing-test",
  "/investment/projects/unknown",
  "/remittances",
]) {
  const { response, html } = await read(pathname);
  assert.equal(response.status, 404, pathname);
  checkDocument(html, "/404", false);
}
for (const [pathname, destination] of [
  ["/index.html", "/"],
  ["/tourism/", "/tourism"],
  ["/tourism.html", "/tourism"],
  [
    "/onesa-ai-tourism-virtual-experince",
    "/onesa-ai-tourism-virtual-experience",
  ],
  [
    "/onesa-ai-tourism-augmented-experince",
    "/onesa-ai-tourism-augmented-experience",
  ],
]) {
  const { response } = await read(pathname);
  assert(
    [301, 308].includes(response.status),
    `${pathname}: permanent redirect`
  );
  assert.equal(
    new URL(response.headers.get("location"), base).pathname,
    destination
  );
}
const { response: trackedResponse, html: tracked } = await read(
  "/tourism?utm_source=seo-audit"
);
assert.equal(trackedResponse.status, 200);
checkDocument(tracked, "/tourism", true);
const { response: robotsResponse, html: robots } = await read("/robots.txt");
assert.equal(robotsResponse.status, 200);
assert(robotsResponse.headers.get("content-type")?.includes("text/plain"));
assert(
  robots.includes("User-agent: *") &&
    robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`)
);
for (const [pathname, status] of [
  ["/api/admin/overview", 401],
  ["/api/no-such-indexing-test", 404],
]) {
  const { response } = await read(pathname);
  assert.equal(response.status, status);
  assert(response.headers.get("content-type")?.includes("application/json"));
}
const { html: homeHtml } = await read("/");
const entryAssets = [
  ...homeHtml.matchAll(/<script\b[^>]*src="(\/assets\/[^"?]+\.js)"/g),
].map(match => match[1]);
assert(entryAssets.length > 0, "Public HTML must load a browser entry bundle");
const pendingAssets = new Set(entryAssets);
const checkedAssets = new Set();
while (pendingAssets.size) {
  const batch = [...pendingAssets].slice(0, 8);
  batch.forEach(asset => {
    pendingAssets.delete(asset);
    checkedAssets.add(asset);
  });
  const sources = await Promise.all(
    batch.map(async asset => {
      const { response, html: source } = await read(asset);
      assert.equal(response.status, 200, asset);
      assert(
        response.headers.get("content-type")?.includes("javascript"),
        `${asset}: JavaScript content type`
      );
      assertActiveFrontendApi(source, asset);
      return referencedFrontendScripts(source, asset);
    })
  );
  sources.flat().forEach(asset => {
    if (!checkedAssets.has(asset)) pendingAssets.add(asset);
  });
}
console.log(
  `PASS ${checkedAssets.size} published browser JavaScript chunks do not use a retired Render backend`
);
console.log(
  `PASS ${urls.length} public canonical pages; private noindex pages; genuine 404s; redirects; robots; API proxy`
);
