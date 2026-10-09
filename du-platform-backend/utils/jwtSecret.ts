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
    // Dev/test fallback — never deploy without a real JWT_SECRET.
    console.warn("[jwtSecret] WARNING: JWT_SECRET is not set. Using insecure development fallback. Set JWT_SECRET in your .env file.");
    return "dev-local-jwt-secret-change-me";
  }

  throw new Error("JWT_SECRET is not configured.");
}
