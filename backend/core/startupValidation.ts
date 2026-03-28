import { isMemoryFallbackEnabled } from "../shared/databaseRuntime";

function hasEnv(name: string) {
  return String(process.env[name] ?? "").trim().length > 0;
}

function getEnv(name: string, fallback = "") {
  return String(process.env[name] ?? fallback).trim();
}

function resolveSelectedProvider(name: "FINTECH_REMITTANCE_PROVIDER" | "FINTECH_AIRTIME_PROVIDER", fallback: string) {
  return getEnv(name, fallback).toLowerCase() || fallback;
}

function collectDatabaseConfigErrors(errors: string[]) {
  const nodeEnv = getEnv("NODE_ENV", "development").toLowerCase();
  if (nodeEnv === "production" && !isMemoryFallbackEnabled()) {
    const hasUrl = hasEnv("AIVEN_MYSQL_URL");
    const hasDiscreteConfig =
      hasEnv("AIVEN_MYSQL_HOST") && hasEnv("AIVEN_MYSQL_USER") && hasEnv("AIVEN_MYSQL_DATABASE");
    if (!hasUrl && !hasDiscreteConfig) {
      errors.push("Production requires AIVEN_MYSQL_URL or AIVEN_MYSQL_HOST/AIVEN_MYSQL_USER/AIVEN_MYSQL_DATABASE.");
    }
  }
}

function collectFintechProviderConfigErrors(errors: string[]) {
  const sandboxMock = getEnv("FINANCIAL_SANDBOX_MOCK", "false").toLowerCase() === "true";
  if (sandboxMock) return;

  const remittanceProvider = resolveSelectedProvider("FINTECH_REMITTANCE_PROVIDER", "terrapay");
  if (remittanceProvider === "terrapay") {
    if (!hasEnv("TERRAPAY_USERNAME")) errors.push("Missing TERRAPAY_USERNAME.");
    if (!hasEnv("TERRAPAY_PASSWORD")) errors.push("Missing TERRAPAY_PASSWORD.");
    if (!hasEnv("TERRAPAY_BASE_URL")) errors.push("Missing TERRAPAY_BASE_URL.");
  }

  const airtimeProvider = resolveSelectedProvider("FINTECH_AIRTIME_PROVIDER", "reloadly");
  if (airtimeProvider === "reloadly") {
    if (!hasEnv("RELOADLY_CLIENT_ID")) errors.push("Missing RELOADLY_CLIENT_ID.");
    if (!hasEnv("RELOADLY_CLIENT_SECRET")) errors.push("Missing RELOADLY_CLIENT_SECRET.");
    if (!hasEnv("RELOADLY_BASE_URL")) errors.push("Missing RELOADLY_BASE_URL.");
  }
}

function collectKycConfigErrors(errors: string[]) {
  const nodeEnv = getEnv("NODE_ENV", "development").toLowerCase();
  if (nodeEnv !== "production") return;

  // When running in sandbox/mock mode live provider secrets are not required.
  const sandboxMock = getEnv("FINANCIAL_SANDBOX_MOCK", "false").toLowerCase() === "true";
  if (sandboxMock) return;

  if (!hasEnv("KYC_VERIFICATION_SECRET")) {
    errors.push("Production requires KYC_VERIFICATION_SECRET for provider-driven KYC decisions.");
  }
  if (!hasEnv("FINTECH_WEBHOOK_SECRET")) {
    errors.push("Production requires FINTECH_WEBHOOK_SECRET for provider callback verification.");
  }
  if (!hasEnv("FINTECH_QUOTE_TOKEN_SECRET")) {
    errors.push(
      "Production requires FINTECH_QUOTE_TOKEN_SECRET to sign remittance quote tokens. " +
      "This must be distinct from JWT_SECRET to maintain key separation."
    );
  }
}

export function validateStartupConfiguration() {
  const errors: string[] = [];

  collectDatabaseConfigErrors(errors);
  collectFintechProviderConfigErrors(errors);
  collectKycConfigErrors(errors);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
