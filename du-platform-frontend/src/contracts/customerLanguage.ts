export const CUSTOMER_LANGUAGES = ["en", "de", "sn", "nd"] as const;
export type CustomerLanguage = (typeof CUSTOMER_LANGUAGES)[number];
export function customerLanguage(value: unknown): CustomerLanguage {
  const code =
    typeof value === "string"
      ? value.trim().toLowerCase().split(/[-_]/)[0]
      : "en";
  return CUSTOMER_LANGUAGES.includes(code as CustomerLanguage)
    ? (code as CustomerLanguage)
    : "en";
}
