export function resolveJwtSecret(): string {
  const configured = String(process.env.JWT_SECRET ?? "").trim();
  const nodeEnv = String(process.env.NODE_ENV ?? "development").trim().toLowerCase();

  if (configured) {
    if (nodeEnv === "production" && configured.length < 32) {
      throw new Error("JWT_SECRET must be at least 32 characters in production.");
    }
    return configured;
  }

  if (nodeEnv !== "production") {
    // Dev/test fallback to avoid local startup/runtime failures when JWT_SECRET is missing.
    return "dev-local-jwt-secret-change-me";
  }

  throw new Error("JWT_SECRET is not configured.");
}
