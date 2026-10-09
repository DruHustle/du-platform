import {
  DEFAULT_SENDER_COUNTRIES,
  type SenderCountryConfig,
} from "../../../../shared/fintechSenderCountries";

export type { SenderCountryConfig };

export function resolveSenderCountriesConfig(): SenderCountryConfig[] {
  const configured = String(process.env.FINTECH_SENDER_COUNTRIES ?? "").trim();
  if (!configured) return DEFAULT_SENDER_COUNTRIES;

  const byCode = new Map(DEFAULT_SENDER_COUNTRIES.map((country) => [country.code, country]));
  const resolved = configured
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean)
    .map((code) => byCode.get(code))
    .filter((country): country is SenderCountryConfig => Boolean(country));

  return resolved.length > 0 ? resolved : DEFAULT_SENDER_COUNTRIES;
}
