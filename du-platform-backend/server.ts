import { databaseStartupMode } from "./shared/databaseStartup";
import { startOrderNotificationWorker } from "./modules/shop/orderNotifications";
import { startTransactionalWorker } from "./modules/notifications/transactionalWorker";
import { startNewsletterWorker } from "./modules/newsletter/worker";
import compression from "compression";
import express from "express";
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
import { validateStartupConfiguration } from "./core/startupValidation";

type ModularServerOptions = {
  backend: {
    db: Pool | null;
    serverStartedAt: number;
  };
};

export function createModularServer(options: ModularServerOptions) {
  const app = express();

  app.use(compression());
  registerCoreMiddleware(app);
  registerApiRoutes(app, {
    backend: options.backend,
  });
  registerDomainModules(app);

  // The API never serves or builds the web application.
  app.use("/api", notFoundHandler);

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
    if (databaseStartupMode() === "verify" || !isMemoryFallbackEnabled()) {
      throw error;
    }
    console.warn(
      "[db] Database initialization failed. Continuing with in-memory fallback mode."
    );
    console.warn(error);
  }

  const app = createModularServer({
    backend: {
      db,
      serverStartedAt: Date.now(),
    },
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
  const stopTransactionalMessages = startTransactionalWorker();
  server.once("close", stopTransactionalMessages);
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
