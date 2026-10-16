import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readSiteRoutes } from "../lib/site-routes.mjs";
import { assertActiveFrontendApi } from "../lib/frontend-api-origin.mjs";
import {
  PUBLIC_SITE_ORIGIN,
  resolveCanonicalUrl,
  resolveRouteSeo,
} from "../../shared/routeSeo.ts";

const root = path.resolve("dist/public");
const { paths, redirects } = readSiteRoutes();
assert(paths.includes("/admin"), "Preserve the protected admin document route");
const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
assert.equal(config.cleanUrls, true);
assert.equal(config.trailingSlash, false);
assert.deepEqual(config.rewrites, [
  {
    source: "/api/:path*",
    destination: "https://du-api.152-70-22-84.sslip.io/api/:path*",
  },
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
  const seo = resolveRouteSeo({ pathname });
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
  assert(html.includes(`<title>${seo.title}</title>`), `${pathname}: title`);
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
  if (seo.robots === "index,follow") expectedLocations.push(canonical);
  console.log(`PASS initial HTML ${pathname}`);
}
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
