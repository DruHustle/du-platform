import { databaseStartupMode } from "../shared/databaseStartup";
import { isMemoryFallbackEnabled } from "../shared/databaseRuntime";
import { databaseProvider } from "../shared/databaseConfig";

function hasEnv(name: string) {
  return String(process.env[name] ?? "").trim().length > 0;
}

function getEnv(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function collectDatabaseConfigErrors(errors: string[]) {
  const nodeEnv = getEnv("NODE_ENV", "development").toLowerCase();
  if (nodeEnv === "production" && !isMemoryFallbackEnabled()) {
    const provider = databaseProvider(process.env);
    const prefix = provider === "aiven" ? "AIVEN_MYSQL" : "MYSQL";
    const urlName = provider === "aiven" ? "AIVEN_MYSQL_URL" : "DATABASE_URL";
    const hasUrl = hasEnv(urlName);
    const hasDiscreteConfig =
      hasEnv(`${prefix}_HOST`) &&
      hasEnv(`${prefix}_USER`) &&
      hasEnv(`${prefix}_DATABASE`);
    if (!hasUrl && !hasDiscreteConfig) {
      errors.push(
        `Production requires ${urlName} or ${prefix}_HOST/${prefix}_USER/${prefix}_DATABASE.`
      );
    }
  }
}

export function validateStartupConfiguration() {
  const errors: string[] = [];
  databaseStartupMode();

  collectDatabaseConfigErrors(errors);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
