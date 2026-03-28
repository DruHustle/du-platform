export type ReceiverCountryConfig = {
  code: string;
  flag: string;
  name: string;
  currency: string;
};

/**
 * TerraPay-supported receiving countries.
 * The list covers corridors currently active on the platform.
 * Zimbabwe is the default (index 0).
 */
export const DEFAULT_RECEIVER_COUNTRIES: ReceiverCountryConfig[] = [
  { code: "ZW", flag: "🇿🇼", name: "Zimbabwe",             currency: "USD" },
  { code: "ZM", flag: "🇿🇲", name: "Zambia",               currency: "ZMW" },
  { code: "KE", flag: "🇰🇪", name: "Kenya",                currency: "KES" },
  { code: "UG", flag: "🇺🇬", name: "Uganda",               currency: "UGX" },
  { code: "TZ", flag: "🇹🇿", name: "Tanzania",             currency: "TZS" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria",              currency: "NGN" },
  { code: "GH", flag: "🇬🇭", name: "Ghana",                currency: "GHS" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",               currency: "RWF" },
  { code: "MW", flag: "🇲🇼", name: "Malawi",               currency: "MWK" },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique",           currency: "MZN" },
  { code: "BW", flag: "🇧🇼", name: "Botswana",             currency: "BWP" },
  { code: "ET", flag: "🇪🇹", name: "Ethiopia",             currency: "ETB" },
  { code: "CM", flag: "🇨🇲", name: "Cameroon",             currency: "XAF" },
  { code: "SN", flag: "🇸🇳", name: "Senegal",              currency: "XOF" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire",        currency: "XOF" },
];
