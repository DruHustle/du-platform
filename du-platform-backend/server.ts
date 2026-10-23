import { startOrderNotificationWorker } from "./modules/shop/orderNotifications";
import { startNewsletterWorker } from "./modules/newsletter/worker";
import compression from "compression";
import express from "express";
import fs from "fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import type { Pool } from "mysql2/promise";
import { initializeDatabase } from "./db";
import { registerCoreMiddleware } from "./core/middleware";
import { errorHandler, notFoundHandler } from "./core/errorHandler";
import { registerDomainModules } from "./modules";
import { registerApiRoutes } from "./api";
import { db, isMemoryFallbackEnabled } from "./shared/databaseRuntime";
import { resolveJwtSecret } from "./utils/jwtSecret";
import { injectSeoIntoHtml, resolveRouteSeo } from "../shared/routeSeo";
import { validateStartupConfiguration } from "./core/startupValidation";

type ModularServerOptions = {
  backend: {
    db: Pool | null;
    serverStartedAt: number;
  };
  staticPath?: string | null;
};

export function getSpaDocumentStatus(canonicalPath: string): 200 | 404 {
  return canonicalPath === "/404" ? 404 : 200;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createModularServer(options: ModularServerOptions) {
  const app = express();

  app.use(compression());
  registerCoreMiddleware(app);
  registerApiRoutes(app, {
    backend: options.backend,
  });
  registerDomainModules(app);

  // Ensure API consumers receive JSON 404s instead of the SPA shell.
  app.use("/api", notFoundHandler);

  if (options.staticPath) {
    const staticIndexPath = path.join(options.staticPath, "index.html");
    let cachedIndexHtml: string | null = null;
    const getIndexHtml = () => {
      if (cachedIndexHtml == null) {
        cachedIndexHtml = fs.readFileSync(staticIndexPath, "utf8");
      }
      return cachedIndexHtml;
    };

    app.use(
      express.static(options.staticPath, {
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

function parsePort(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const port = Math.floor(parsed);
  if (port <= 0 || port > 65535) return null;
  return port;
}

export async function startServer() {
  process.on("unhandledRejection", reason => {
    console.error("[process] Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", error => {
    console.error("[process] Uncaught exception:", error);
  });

  // Validate JWT_SECRET eagerly so a misconfigured production deployment fails
  // immediately at startup rather than surfacing a 500 on the first authenticated request.
  try {
    resolveJwtSecret();
  } catch (jwtError) {
    const nodeEnv = String(process.env.NODE_ENV ?? "development").toLowerCase();
    if (nodeEnv === "production") {
      console.error(
        "[startup] JWT_SECRET validation failed:",
        jwtError instanceof Error ? jwtError.message : jwtError
      );
      process.exit(1);
    }
    // In dev/test the fallback secret is acceptable — log a reminder only.
    console.warn(
      "[startup] JWT_SECRET is not set; using insecure dev fallback. Set JWT_SECRET before deploying."
    );
  }

  try {
    validateStartupConfiguration();
  } catch (configError) {
    console.error(
      "[startup] Configuration validation failed:",
      configError instanceof Error ? configError.message : configError
    );
    process.exit(1);
  }

  try {
    await initializeDatabase();
  } catch (error) {
    if (!isMemoryFallbackEnabled()) {
      throw error;
    }
    console.warn(
      "[db] Database initialization failed. Continuing with in-memory fallback mode."
    );
    console.warn(error);
  }

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  const app = createModularServer({
    backend: {
      db,
      serverStartedAt: Date.now(),
    },
    staticPath,
  });
  const server = createServer(app);
  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 65_000;
  server.requestTimeout = 180_000;

  const envMode = String(process.env.NODE_ENV ?? "development").toLowerCase();
  const isProduction = envMode === "production";
  const isTest = envMode === "test";
  const requestedPort = isProduction
    ? (parsePort(process.env.PORT) ?? parsePort(process.env.PROD_PORT) ?? 3000)
    : isTest
      ? (parsePort(process.env.TEST_PORT) ??
        parsePort(process.env.PORT) ??
        5002)
      : (parsePort(process.env.DEV_PORT) ??
        parsePort(process.env.PORT) ??
        5001);
  const allowPortFallback =
    String(process.env.ALLOW_PORT_FALLBACK ?? "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";

  const listenWithFallback = async (
    startPort: number,
    maxAttempts = 20
  ): Promise<number> => {
    let attempt = 0;
    let candidate = startPort;

    while (attempt < maxAttempts) {
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (error: NodeJS.ErrnoException) => {
            server.off("listening", onListening);
            reject(error);
          };
          const onListening = () => {
            server.off("error", onError);
            resolve();
          };

          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(candidate);
        });
        return candidate;
      } catch (error: any) {
        if (error?.code !== "EADDRINUSE") {
          throw error;
        }
        candidate += 1;
        attempt += 1;
      }
    }

    throw new Error(
      `No open port found starting from ${startPort} after ${maxAttempts} attempts.`
    );
  };

  let activePort = requestedPort;
  if (allowPortFallback) {
    activePort = await listenWithFallback(requestedPort);
  } else {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(requestedPort);
    });
  }

  if (activePort !== requestedPort) {
    console.warn(
      `[server] Port ${requestedPort} is in use. Switched to ${activePort}.`
    );
  }

  const stopOrderWorker = startOrderNotificationWorker();
  const stopNewsletterWorker = startNewsletterWorker();
  server.once("close", stopNewsletterWorker);
  server.once("close", stopOrderWorker);

  console.log(`Server running on http://localhost:${activePort}/`);
  return { app, server, port: activePort };
}

const isMainModule =
  process.argv[1] != null &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  startServer().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
