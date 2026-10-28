import fs from "node:fs";
import path from "node:path";
import { PUBLIC_SITE_ORIGIN } from "../../shared/routeSeo.ts";
import { createSitemap } from "./lib/site-routes.mjs";
import { frontendDir } from "./lib/paths.mjs";

const sitemapPath = path.join(frontendDir, "public/sitemap.xml");
const sitemap = createSitemap(process.env.SITE_URL || PUBLIC_SITE_ORIGIN);
fs.writeFileSync(sitemapPath, sitemap);
console.log(
  `[sitemap] Wrote ${(sitemap.match(/<loc>/g) || []).length} routes to ${path.relative(process.cwd(), sitemapPath)}`
);
