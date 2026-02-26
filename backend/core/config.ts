export type AppConfig = {
  env: string;
  port: number;
  corsOrigins: string[];
  jwtSecret: string;
  fintech: {
    terrapayBaseUrl: string;
    reloadlyBaseUrl: string;
    sandboxMock: boolean;
  };
};

function splitCsv(input: string): string[] {
  return String(input)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function toBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function loadConfig(): AppConfig {
  const env = String(process.env.NODE_ENV ?? 'development');
  const port = Number(process.env.PORT ?? process.env.DEV_PORT ?? 5001);

  return {
    env,
    port: Number.isFinite(port) && port > 0 ? Math.floor(port) : 5001,
    corsOrigins: splitCsv(process.env.CORS_ORIGINS ?? '').length
      ? splitCsv(process.env.CORS_ORIGINS ?? '')
      : ['http://localhost:3000', 'https://localhost:3000'],
    jwtSecret: String(process.env.JWT_SECRET ?? ''),
    fintech: {
      terrapayBaseUrl: String(process.env.TERRAPAY_BASE_URL ?? 'https://uat-connect.terrapay.com'),
      reloadlyBaseUrl: String(process.env.RELOADLY_BASE_URL ?? 'https://topups-sandbox.reloadly.com'),
      sandboxMock: toBoolean(process.env.FINANCIAL_SANDBOX_MOCK, env !== 'production'),
    },
  };
}
