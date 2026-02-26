import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const appPath = path.join(repoRoot, "frontend", "src", "App.tsx");
const sitemapPath = path.join(repoRoot, "frontend", "public", "sitemap.xml");
const siteUrl = (process.env.SITE_URL || "https://www.diasporaunlocked.com").replace(/\/+$/, "");

const appSource = fs.readFileSync(appPath, "utf8");

const routeRegex = /<Route\s+path="([^"]+)"/g;
const skipExact = new Set([
  "/404",
  "/coming-soon",
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

const routes = new Set();
for (const match of appSource.matchAll(routeRegex)) {
  const route = match[1]?.trim();
  if (!route) continue;
  if (route.includes(":")) continue; // Skip dynamic routes.
  if (skipExact.has(route)) continue; // Skip non-index/public auth/admin routes.
  routes.add(route);
}

const sortedRoutes = [...routes].sort((a, b) => {
  if (a === "/") return -1;
  if (b === "/") return 1;
  return a.localeCompare(b);
});

const now = new Date().toISOString().slice(0, 10);
const urls = sortedRoutes
  .map((route) => {
    const loc = route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`;
    return [
      "  <url>",
      `    <loc>${loc}</loc>`,
      `    <lastmod>${now}</lastmod>`,
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    ].join("\n");
  })
  .join("\n");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  urls,
  "</urlset>",
  "",
].join("\n");

fs.writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`[sitemap] Wrote ${sortedRoutes.length} routes to ${path.relative(repoRoot, sitemapPath)}`);
