export const DEFAULT_SUPPORTED_BANKS = ["ZB Bank", "CBZ", "BancABC", "Steward Bank"] as const;

export type RemittancePolicy = {
  maxPerTransaction: number;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  quoteGracePeriodMs: number;
  supportedBanks: string[];
};

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Number(parsed.toFixed(2));
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function getRemittancePolicy(): RemittancePolicy {
  const maxPerTransaction = parsePositiveNumber(process.env.FINTECH_REMITTANCE_MAX_AMOUNT, 5000);
  const dailyLimit = parsePositiveNumber(process.env.FINTECH_REMITTANCE_DAILY_LIMIT, 5000);
  const weeklyLimit = parsePositiveNumber(process.env.FINTECH_REMITTANCE_WEEKLY_LIMIT, 15000);
  const monthlyLimit = parsePositiveNumber(process.env.FINTECH_REMITTANCE_MONTHLY_LIMIT, 50000);
  const quoteGracePeriodMs = parsePositiveInteger(process.env.FINTECH_REMITTANCE_QUOTE_GRACE_MS, 30_000);

  const configuredBanks = String(process.env.FINTECH_SUPPORTED_BANKS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    maxPerTransaction,
    dailyLimit,
    weeklyLimit,
    monthlyLimit,
    quoteGracePeriodMs,
    supportedBanks: configuredBanks.length > 0 ? configuredBanks : [...DEFAULT_SUPPORTED_BANKS],
  };
}
