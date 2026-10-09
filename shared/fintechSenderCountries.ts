export type SenderCountryConfig = {
  code: string;
  flag: string;
  name: string;
  currency: string;
};

export const DEFAULT_SENDER_COUNTRIES: SenderCountryConfig[] = [
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", currency: "GBP" },
  { code: "US", flag: "🇺🇸", name: "United States", currency: "USD" },
  { code: "ZA", flag: "🇿🇦", name: "South Africa", currency: "ZAR" },
  { code: "AT", flag: "🇦🇹", name: "Austria", currency: "EUR" },
  { code: "BE", flag: "🇧🇪", name: "Belgium", currency: "EUR" },
  { code: "BG", flag: "🇧🇬", name: "Bulgaria", currency: "EUR" },
  { code: "HR", flag: "🇭🇷", name: "Croatia", currency: "EUR" },
  { code: "CY", flag: "🇨🇾", name: "Cyprus", currency: "EUR" },
  { code: "CZ", flag: "🇨🇿", name: "Czech Republic", currency: "EUR" },
  { code: "DK", flag: "🇩🇰", name: "Denmark", currency: "EUR" },
  { code: "EE", flag: "🇪🇪", name: "Estonia", currency: "EUR" },
  { code: "FI", flag: "🇫🇮", name: "Finland", currency: "EUR" },
  { code: "FR", flag: "🇫🇷", name: "France", currency: "EUR" },
  { code: "DE", flag: "🇩🇪", name: "Germany", currency: "EUR" },
  { code: "GR", flag: "🇬🇷", name: "Greece", currency: "EUR" },
  { code: "HU", flag: "🇭🇺", name: "Hungary", currency: "EUR" },
  { code: "IE", flag: "🇮🇪", name: "Ireland", currency: "EUR" },
  { code: "IT", flag: "🇮🇹", name: "Italy", currency: "EUR" },
  { code: "LV", flag: "🇱🇻", name: "Latvia", currency: "EUR" },
  { code: "LT", flag: "🇱🇹", name: "Lithuania", currency: "EUR" },
  { code: "LU", flag: "🇱🇺", name: "Luxembourg", currency: "EUR" },
  { code: "MT", flag: "🇲🇹", name: "Malta", currency: "EUR" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", currency: "EUR" },
  { code: "PL", flag: "🇵🇱", name: "Poland", currency: "EUR" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", currency: "EUR" },
  { code: "RO", flag: "🇷🇴", name: "Romania", currency: "EUR" },
  { code: "SK", flag: "🇸🇰", name: "Slovakia", currency: "EUR" },
  { code: "SI", flag: "🇸🇮", name: "Slovenia", currency: "EUR" },
  { code: "ES", flag: "🇪🇸", name: "Spain", currency: "EUR" },
  { code: "SE", flag: "🇸🇪", name: "Sweden", currency: "EUR" },
];
