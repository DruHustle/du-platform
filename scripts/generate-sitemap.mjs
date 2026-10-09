import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const frontendSourcePath = path.join(repoRoot, "du-platform-frontend", "src");
const sitemapPath = path.join(repoRoot, "du-platform-frontend", "public", "sitemap.xml");
const siteUrl = (process.env.SITE_URL || "https://www.diasporaunlocked.com").replace(/\/+$/, "");

const routeFactoryRegex = /create(?:Static|Lazy)Route\(\s*"([^"]+)"/g;
const skipExact = new Set([
  "/404",
  "/coming-soon",
  "/admin",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/search",
]);

const routes = new Set();
const routeManifestPaths = fs
  .readdirSync(path.join(frontendSourcePath, "modules"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(frontendSourcePath, "modules", entry.name, "routes.tsx"))
  .filter((routePath) => fs.existsSync(routePath));

for (const routeManifestPath of routeManifestPaths) {
  const routeSource = fs.readFileSync(routeManifestPath, "utf8");
  for (const match of routeSource.matchAll(routeFactoryRegex)) {
    const route = match[1]?.trim();
    if (!route || route.includes(":") || skipExact.has(route)) continue;
    routes.add(route);
  }
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
