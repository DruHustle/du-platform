// Local browser integration harness. Production API and web are deployed separately.
import express from "express";
import fs from "node:fs";
import path from "node:path";
import type { Pool } from "mysql2/promise";
import { createModularServer as createApiServer } from "../../../../du-platform-backend/server";
import { injectSeoIntoHtml, resolveRouteSeo } from "../../../../du-platform-frontend/web/src/domain/routeSeo";
import { resolveTravelRedirect } from "../../../../du-platform-frontend/web/src/domain/travelRoutes";

export function createModularServer(options: { backend: { db: Pool | null; serverStartedAt: number }; staticPath: string | null }) {
  const app = express();
  const api = createApiServer({ backend: options.backend });
  app.use((req, res, next) => req.path === "/api" || req.path.startsWith("/api/") ? api(req, res, next) : next());
  const getSpaDocumentStatus = (canonicalPath: string) => canonicalPath === "/404" ? 404 : 200;
  app.get("*", (req, res, next) => {
    const destination = resolveTravelRedirect(req.path);
    if (!destination) return next();
    const queryIndex = req.originalUrl.indexOf("?");
    return res.redirect(
      308,
      destination + (queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "")
    );
  });

  if (options.staticPath) {
    const staticIndexPath = path.join(options.staticPath, "index.html");
    let cachedIndexHtml: string | null = null;
    const getIndexHtml = () => {
      if (cachedIndexHtml == null) {
        cachedIndexHtml = fs.readFileSync(staticIndexPath, "utf8");
      }
      return cachedIndexHtml;
    };

    // Serve generated clean-URL documents before directory handling. A route
    // such as /travel also has a folder for child pages; static's directory
    // redirect would otherwise turn it into /travel/ and break SPA matching.
    app.use((req, res, next) => {
      if (!["GET", "HEAD"].includes(req.method) || path.extname(req.path))
        return next();
      const root = path.resolve(options.staticPath!);
      const clean = req.path.replace(/\/$/, "");
      const file = path.resolve(root, "." + (clean || "/index") + ".html");
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file))
        return next();
      res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
      res.status(
        getSpaDocumentStatus(
          resolveRouteSeo({ pathname: req.path }).canonicalPath
        )
      );
      return res.sendFile(file);
    });

    app.use(
      express.static(options.staticPath, {
        redirect: false,
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          const relativePath = path
            .relative(options.staticPath as string, filePath)
            .replace(/\\/g, "/");

          if (relativePath.endsWith(".html")) {
            res.setHeader(
              "Cache-Control",
              "no-cache, max-age=0, must-revalidate"
            );
            return;
          }

          if (/^assets\/.+-[A-Za-z0-9_-]{8,}\.[^/]+$/i.test(relativePath)) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable"
            );
            return;
          }

          if (
            /\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?|mp3|wav)$/i.test(
              relativePath
            )
          ) {
            res.setHeader("Cache-Control", "public, max-age=86400");
            return;
          }

          res.setHeader("Cache-Control", "public, max-age=3600");
        },
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
      const siteUrl = String(
        process.env.VITE_SITE_URL ||
          process.env.APP_BASE_URL ||
          `${req.protocol}://${req.get("host") || "localhost"}`
      )
        .trim()
        .replace(/\/+$/, "");
      const url = new URL(
        req.originalUrl || req.url,
        `${siteUrl || "http://localhost"}/`
      );
      const seo = resolveRouteSeo({
        pathname: url.pathname,
        search: url.search,
      });
      const html = injectSeoIntoHtml(getIndexHtml(), seo, siteUrl);
      const status = getSpaDocumentStatus(seo.canonicalPath);
      res.status(status).type("html").send(html);
    });
  }

  return app;
}
