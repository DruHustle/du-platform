import mysql from "mysql2/promise";
import { databaseConnectionOptions } from "./databaseConfig";

export type DbLike = mysql.Pool | null;

const NODE_ENV = String(process.env.NODE_ENV ?? "development")
  .trim()
  .toLowerCase();
const MEMORY_FALLBACK_OVERRIDE =
  String(process.env.ALLOW_MEMORY_FALLBACK ?? "")
    .trim()
    .toLowerCase() === "true";
const MEMORY_FALLBACK_ENABLED =
  NODE_ENV !== "production" || MEMORY_FALLBACK_OVERRIDE;

export function isMemoryFallbackEnabled(): boolean {
  return MEMORY_FALLBACK_ENABLED;
}

function createUtcPool(options: mysql.PoolOptions): mysql.Pool {
  const pool = mysql.createPool({ ...options, timezone: "Z" });
  pool.on("connection", connection => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}
function buildPoolFromEnv(): DbLike {
  const options = databaseConnectionOptions(process.env);
  return options ? createUtcPool(options) : null;
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
