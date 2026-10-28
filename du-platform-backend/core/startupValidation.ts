import { isMemoryFallbackEnabled } from "../lib/databaseRuntime";

function hasEnv(name: string) {
  return String(process.env[name] ?? "").trim().length > 0;
}

function getEnv(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function collectDatabaseConfigErrors(errors: string[]) {
  const nodeEnv = getEnv("NODE_ENV", "development").toLowerCase();
  if (nodeEnv === "production" && !isMemoryFallbackEnabled()) {
    const hasUrl = hasEnv("AIVEN_MYSQL_URL");
    const hasDiscreteConfig =
      hasEnv("AIVEN_MYSQL_HOST") &&
      hasEnv("AIVEN_MYSQL_USER") &&
      hasEnv("AIVEN_MYSQL_DATABASE");
    if (!hasUrl && !hasDiscreteConfig) {
      errors.push(
        "Production requires AIVEN_MYSQL_URL or AIVEN_MYSQL_HOST/AIVEN_MYSQL_USER/AIVEN_MYSQL_DATABASE."
      );
    }
  }
}

export function validateStartupConfiguration() {
  const errors: string[] = [];

  collectDatabaseConfigErrors(errors);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
