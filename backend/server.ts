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

type ModularServerOptions = {
  backend: {
    db: Pool | null;
    serverStartedAt: number;
  };
  staticPath?: string | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createModularServer(options: ModularServerOptions) {
  const app = express();

  registerCoreMiddleware(app);
  registerApiRoutes(app, {
    backend: options.backend,
  });
  registerDomainModules(app);

  // Ensure API consumers receive JSON 404s instead of the SPA shell.
  app.use("/api", notFoundHandler);

  if (options.staticPath) {
    app.use(express.static(options.staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(options.staticPath as string, "index.html"));
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
  process.on("unhandledRejection", (reason) => {
    console.error("[process] Unhandled promise rejection:", reason);
  });

  process.on("uncaughtException", (error) => {
    console.error("[process] Uncaught exception:", error);
  });

  try {
    await initializeDatabase();
  } catch (error) {
    if (!isMemoryFallbackEnabled()) {
      throw error;
    }
    console.warn("[db] Database initialization failed. Continuing with in-memory fallback mode.");
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
  const requestedPort =
    (isProduction
      ? parsePort(process.env.PORT) ?? parsePort(process.env.PROD_PORT) ?? 3000
      : isTest
        ? parsePort(process.env.TEST_PORT) ?? parsePort(process.env.PORT) ?? 5002
        : parsePort(process.env.DEV_PORT) ?? parsePort(process.env.PORT) ?? 5001);
  const allowPortFallback =
    String(process.env.ALLOW_PORT_FALLBACK ?? "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";

  const listenWithFallback = async (startPort: number, maxAttempts = 20): Promise<number> => {
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

    throw new Error(`No open port found starting from ${startPort} after ${maxAttempts} attempts.`);
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
    console.warn(`[server] Port ${requestedPort} is in use. Switched to ${activePort}.`);
  }

  console.log(`Server running on http://localhost:${activePort}/`);
  return { app, server, port: activePort };
}

const isMainModule = process.argv[1] != null && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMainModule) {
  startServer().catch(console.error);
}
