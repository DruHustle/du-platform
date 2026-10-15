import fs from "node:fs";
import path from "node:path";
import { resolveCanonicalUrl, resolveRouteSeo } from "../../shared/routeSeo.ts";

// Read the domain manifests without importing React or browser-only modules.
// This inventory is shared by the static HTML build and sitemap generation.
export function readSiteRoutes(root = process.cwd()) {
  const modules = path.join(root, "du-platform-frontend/src/modules");
  const paths = new Set();
  const redirects = [];
  for (const entry of fs.readdirSync(modules, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(modules, entry.name, "routes.tsx");
    if (!fs.existsSync(manifest)) continue;
    const source = fs.readFileSync(manifest, "utf8");
    // Guarded routes such as /admin declare a literal path with a render
    // function rather than using the lazy/static route factories.
    for (const match of source.matchAll(/\bpath:\s*"([^"]+)"/g)) {
      if (match[1].includes(":"))
        throw new Error(
          `Add static document coverage for dynamic route ${match[1]}`
        );
      paths.add(match[1]);
    }
    for (const match of source.matchAll(
      /create(?:Static|Lazy)Route\(\s*"([^"]+)"/g
    )) {
      const route = match[1];
      if (route === "/investment/projects/:id") {
        const projects = JSON.parse(
          fs.readFileSync(
            path.join(root, "shared/investmentProjectRoutes.json"),
            "utf8"
          )
        );
        for (const id of Object.keys(projects))
          paths.add(`/investment/projects/${id}`);
      } else if (route.includes(":")) {
        throw new Error(
          `Add static document coverage for dynamic route ${route}`
        );
      } else {
        paths.add(route);
      }
    }
    for (const match of source.matchAll(
      /createRedirectRoute\(\s*"([^"]+)"\s*,\s*"([^"]+)"/g
    )) {
      redirects.push({ source: match[1], destination: match[2] });
    }
  }
  return { paths: [...paths].sort(), redirects };
}

export function createSitemap(siteUrl, root = process.cwd()) {
  const routes = readSiteRoutes(root)
    .paths.filter(
      route => resolveRouteSeo({ pathname: route }).robots === "index,follow"
    )
    .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)));
  const urls = routes.map(route =>
    [
      "  <url>",
      `    <loc>${resolveCanonicalUrl(siteUrl, route).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</loc>`,
      "    <changefreq>weekly</changefreq>",
      "    <priority>0.8</priority>",
      "  </url>",
    ].join("\n")
  );
  // Omit lastmod until a real per-page content modification date is available.
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
