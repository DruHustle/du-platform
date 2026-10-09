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

function buildDefaultCorsOrigins(env: string): string[] {
  const defaults = [
    'https://diasporaunlocked.com',
    'https://www.diasporaunlocked.com',
  ];

  const appBaseUrl = String(process.env.APP_BASE_URL ?? process.env.VITE_SITE_URL ?? '').trim();
  if (appBaseUrl) {
    try {
      defaults.push(new URL(appBaseUrl).origin);
    } catch {
      // Ignore invalid APP_BASE_URL formatting and keep other defaults.
    }
  }

  if (env !== 'production') {
    defaults.push(
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    );
  }

  return Array.from(new Set(defaults));
}

export function loadConfig(): AppConfig {
  const env = String(process.env.NODE_ENV ?? 'development');
  const port = Number(process.env.PORT ?? process.env.DEV_PORT ?? 5001);

  return {
    env,
    port: Number.isFinite(port) && port > 0 ? Math.floor(port) : 5001,
    corsOrigins: splitCsv(process.env.CORS_ORIGINS ?? '').length
      ? splitCsv(process.env.CORS_ORIGINS ?? '')
      : buildDefaultCorsOrigins(env),
    jwtSecret: String(process.env.JWT_SECRET ?? ''),
    fintech: {
      terrapayBaseUrl: String(process.env.TERRAPAY_BASE_URL ?? 'https://uat-connect.terrapay.com:21211'),
      reloadlyBaseUrl: String(process.env.RELOADLY_BASE_URL ?? 'https://topups-sandbox.reloadly.com'),
      sandboxMock: toBoolean(process.env.FINANCIAL_SANDBOX_MOCK, env !== 'production'),
    },
  };
}
