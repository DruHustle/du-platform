import fs from "node:fs";
import type mysql from "mysql2/promise";

type Environment = Record<string, string | undefined>;

function value(env: Environment, name: string): string | undefined {
  return env[name]?.trim() || undefined;
}

export function databaseProvider(env: Environment): "aiven" | "mysql" {
  const configured = value(env, "DATABASE_PROVIDER")?.toLowerCase();
  const provider = configured || (value(env, "NODE_ENV")?.toLowerCase() === "production" ? "aiven" : "mysql");
  if (provider !== "aiven" && provider !== "mysql") {
    throw new Error("DATABASE_PROVIDER must be aiven or mysql");
  }
  return provider;
}

/** Resolve configuration without connecting or changing the selected database. */
export function databaseConnectionOptions(env: Environment): mysql.PoolOptions | null {
  const production = value(env, "NODE_ENV")?.toLowerCase() === "production";
  const provider = databaseProvider(env);
  const prefix = provider === "aiven" ? "AIVEN_MYSQL" : "MYSQL";
  const rawUrl = value(env, provider === "aiven" ? "AIVEN_MYSQL_URL" : "DATABASE_URL");
  const host = value(env, `${prefix}_HOST`);
  const user = value(env, `${prefix}_USER`);
  const database = value(env, `${prefix}_DATABASE`);
  if (!rawUrl && (!host || !user || !database)) return null;

  let connection: mysql.PoolOptions;
  if (rawUrl) {
    let parsed: URL;
    try { parsed = new URL(rawUrl); }
    catch { throw new Error("The configured database URL is invalid"); }
    if (parsed.protocol !== "mysql:" || !parsed.hostname || !parsed.username || parsed.pathname.length < 2 || parsed.hash) {
      throw new Error("The configured database URL must be a MySQL URL with a host, user and database");
    }
    // TLS is controlled by trusted process configuration, never URL query overrides.
    for (const key of ["ssl-mode", "sslmode", "ssl"]) parsed.searchParams.delete(key);
    connection = { uri: parsed.toString() };
  } else {
    const port = Number(value(env, `${prefix}_PORT`) || "3306");
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("The configured MySQL port is invalid");
    connection = { host, user, database, password: value(env, `${prefix}_PASSWORD`), port };
  }

  const caPrefix = provider === "aiven" ? "AIVEN" : "MYSQL";
  const inlineCa = value(env, `${caPrefix}_CA_CERT`);
  const caPath = value(env, `${caPrefix}_CA_CERT_PATH`);
  let ca = inlineCa;
  if (!ca && caPath) {
    try { ca = fs.readFileSync(caPath, "utf8"); }
    catch { throw new Error(`${caPrefix}_CA_CERT_PATH cannot be read`); }
  }
  if (production && !ca?.trim()) {
    throw new Error(`Production database TLS requires ${caPrefix}_CA_CERT or ${caPrefix}_CA_CERT_PATH`);
  }

  return {
    ...connection,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    ...(ca ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, ca } } : {}),
  };
}
