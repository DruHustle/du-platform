import fs from "fs";
import mysql from "mysql2/promise";

export type DbLike = mysql.Pool | null;

const NODE_ENV = String(process.env.NODE_ENV ?? "development").trim().toLowerCase();
const MEMORY_FALLBACK_OVERRIDE =
  String(process.env.ALLOW_MEMORY_FALLBACK ?? "").trim().toLowerCase() === "true";
const MEMORY_FALLBACK_ENABLED = NODE_ENV !== "production" || MEMORY_FALLBACK_OVERRIDE;

export function isMemoryFallbackEnabled(): boolean {
  return MEMORY_FALLBACK_ENABLED;
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function buildSslConfig() {
  const caFromEnv = getEnv("AIVEN_CA_CERT");
  const caPath = getEnv("AIVEN_CA_CERT_PATH");

  if (caFromEnv) return { rejectUnauthorized: true, ca: caFromEnv };
  if (caPath) {
    if (!fs.existsSync(caPath)) {
      if (NODE_ENV === "production") {
        throw new Error(`[databaseRuntime] AIVEN_CA_CERT_PATH does not exist: ${caPath}`);
      }
    } else {
      return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") };
    }
  }

  if (NODE_ENV === "production") {
    throw new Error(
      "[databaseRuntime] Production database TLS requires AIVEN_CA_CERT or AIVEN_CA_CERT_PATH."
    );
  }
  return { rejectUnauthorized: false };
}

function sanitizeMysqlUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete("ssl-mode");
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function buildPoolFromEnv(): DbLike {
  const isProduction = NODE_ENV === "production";

  if (isProduction) {
    const rawAivenUrl = getEnv("AIVEN_MYSQL_URL");
    const aivenUrl = rawAivenUrl ? sanitizeMysqlUrl(rawAivenUrl) : undefined;
    if (aivenUrl) {
      return mysql.createPool({
        uri: aivenUrl,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        ssl: buildSslConfig(),
      });
    }

    const host = getEnv("AIVEN_MYSQL_HOST");
    const user = getEnv("AIVEN_MYSQL_USER");
    const password = getEnv("AIVEN_MYSQL_PASSWORD");
    const database = getEnv("AIVEN_MYSQL_DATABASE");
    const port = Number(getEnv("AIVEN_MYSQL_PORT") ?? "3306");
    if (!host || !user || !database) return null;

    return mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
      ssl: buildSslConfig(),
    });
  }

  const rawLocalUrl = getEnv("DATABASE_URL");
  const localUrl = rawLocalUrl ? sanitizeMysqlUrl(rawLocalUrl) : undefined;
  if (localUrl) {
    return mysql.createPool({
      uri: localUrl,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    });
  }

  const host = getEnv("MYSQL_HOST");
  const user = getEnv("MYSQL_USER");
  const password = getEnv("MYSQL_PASSWORD");
  const database = getEnv("MYSQL_DATABASE");
  const port = Number(getEnv("MYSQL_PORT") ?? "3306");
  if (!host || !user || !database) return null;

  return mysql.createPool({
    host,
    user,
    password,
    database,
    port,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
}

export const db = buildPoolFromEnv();

export function isDbConnectionError(error: unknown): boolean {
  if (!MEMORY_FALLBACK_ENABLED) return false;
  const code = (error as any)?.code;
  return [
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "EHOSTUNREACH",
    "EPIPE",
    "PROTOCOL_CONNECTION_LOST",
    "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
    "PROTOCOL_ENQUEUE_AFTER_QUIT",
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
    "EPERM",
    "EACCES",
    "ETIMEDOUT",
  ].includes(String(code));
}

export function isTransientShopQueryError(error: unknown): boolean {
  if (!MEMORY_FALLBACK_ENABLED) return false;
  const code = String((error as any)?.code ?? "");
  return [
    "PROTOCOL_CONNECTION_LOST",
    "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
    "PROTOCOL_ENQUEUE_AFTER_QUIT",
    "ER_LOCK_DEADLOCK",
    "ER_LOCK_WAIT_TIMEOUT",
    "ER_QUERY_TIMEOUT",
    "ECONNRESET",
    "ETIMEDOUT",
  ].includes(code);
}
