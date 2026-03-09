import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Bolt,
  CheckCircle2,
  Clock3,
  CreditCard,
  HandCoins,
  Landmark,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

type TransferType = "send_money" | "airtime_topup" | "prepaid_electricity";
type RecipientType = "mobile_money" | "cash_pickup" | "visa_card";
type FormStep = "route" | "quote" | "recipient" | "payout" | "pay" | "status";
type AmountMode = "send" | "receive";
type PayoutEtaTarget = RecipientType | "airtime_topup" | "prepaid_electricity";
type Country = {
  code: string;
  flag: string;
  name: string;
  currency: string;
};
type JsonRecord = Record<string, any>;
type AirtimeOperator = JsonRecord | null;
type UtilityBiller = JsonRecord | null;
type ReloadlyPricing = {
  source: "airtime_topup" | "prepaid_electricity";
  senderCurrencyCode: string;
  destinationCurrencyCode: string;
  destinationLabel: string;
  fxRate: number;
  fee: number | null;
};
type SendMoneyStatus = {
  kind: "airtime" | "remittance" | "utility";
  transaction: JsonRecord | null;
  providerResponse: JsonRecord | null;
  submittedAt: string;
};
type SendMoneyFormState = {
  transferType: TransferType | "";
  senderCountryCode: string;
  receiverCountryCode: string;
  amountSent: string;
  amountReceive: string;
  currencyFrom: string;
  currencyTo: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPhone: string;
  meterNumber: string;
  utilityCustomerName: string;
  utilityBillerId: string;
  recipientType: RecipientType;
  payoutChannel: string;
  mobileNumber: string;
  cashPickupLocation: string;
  cardNumber: string;
  cardExpiryMonth: string;
  cardExpiryYear: string;
  cardHolderName: string;
};
type SendMoneyFormProps = {
  forcedTransferType?: TransferType | null;
};

const CASH_PICKUP_CHANNELS: string[] = [
  "HelloPaisa",
  "Quest Financial Services",
  "ZB Bank",
  "CBZ",
  "BancABC",
  "Steward Bank",
  "Mukuru",
];
const FX_RATE_PREVIEW_AMOUNT = 100;

const SENDER_COUNTRIES: Country[] = [
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

const RECEIVER_COUNTRY: Country = { code: "ZW", flag: "🇿🇼", name: "Zimbabwe", currency: "USD" };

function getLocalizedRegionName(code: string, language: string, fallback: string): string {
  try {
    if (typeof Intl.DisplayNames === "function") {
      const displayNames = new Intl.DisplayNames([language], { type: "region" });
      return displayNames.of(code) || fallback;
    }
  } catch {
    // Ignore Intl locale failures and keep fallback names.
  }
  return fallback;
}

const TRANSFER_TYPES = [
  {
    value: "send_money",
    labelKey: "payments.form.transfer_types.send_money.label",
    labelFallback: "Send Money",
    descriptionKey: "payments.form.transfer_types.send_money.description",
    descriptionFallback: "Transfer to mobile money, cash pickup, or Visa card.",
    icon: ArrowRightLeft,
  },
  {
    value: "airtime_topup",
    labelKey: "payments.form.transfer_types.airtime_topup.label",
    labelFallback: "Airtime Top-up",
    descriptionKey: "payments.form.transfer_types.airtime_topup.description",
    descriptionFallback: "Top up a Zimbabwe mobile line with operator detection.",
    icon: Wallet,
  },
  {
    value: "prepaid_electricity",
    labelKey: "payments.form.transfer_types.prepaid_electricity.label",
    labelFallback: "Prepaid Electricity",
    descriptionKey: "payments.form.transfer_types.prepaid_electricity.description",
    descriptionFallback: "Buy Zimbabwe prepaid electricity tokens using licensed utility rails.",
    icon: Bolt,
  },
] as const;

const PAYOUT_TYPES = [
  { value: "mobile_money", labelKey: "payments.form.payout_types.mobile_money", labelFallback: "Mobile Money", icon: Smartphone },
  { value: "cash_pickup", labelKey: "payments.form.payout_types.cash_pickup", labelFallback: "Cash Pickup", icon: Landmark },
  { value: "visa_card", labelKey: "payments.form.payout_types.visa_card", labelFallback: "Visa Card", icon: CreditCard },
] as const;

const FLOW_STEPS = [
  { id: "route", labelKey: "payments.form.steps.start", labelFallback: "Start" },
  { id: "recipient", labelKey: "payments.form.steps.recipient", labelFallback: "Recipient" },
  { id: "payout", labelKey: "payments.form.steps.payment_method", labelFallback: "Payment Method" },
  { id: "pay", labelKey: "payments.form.steps.pay", labelFallback: "Pay" },
  { id: "status", labelKey: "payments.form.steps.receipt", labelFallback: "Receipt" },
] as const satisfies ReadonlyArray<{ id: FormStep; labelKey: string; labelFallback: string }>;

const INITIAL_FORM: SendMoneyFormState = {
  transferType: "",
  senderCountryCode: "DE",
  receiverCountryCode: "ZW",
  amountSent: "",
  amountReceive: "",
  currencyFrom: "EUR",
  currencyTo: "USD",
  recipientName: "",
  recipientAddress: "",
  recipientCity: "",
  recipientPhone: "",
  meterNumber: "",
  utilityCustomerName: "",
  utilityBillerId: "",
  recipientType: "mobile_money",
  payoutChannel: "",
  mobileNumber: "",
  cashPickupLocation: "",
  cardNumber: "",
  cardExpiryMonth: "",
  cardExpiryYear: "",
  cardHolderName: "",
};

function resolveDefaultSenderCountryCode(): string {
  if (typeof window === "undefined") return "DE";

  const supportedCodes = new Set(SENDER_COUNTRIES.map((country) => country.code));

  const getLocaleRegion = (localeValue: string | null | undefined): string => {
    const raw = String(localeValue ?? "").trim();
    if (!raw) return "";
    try {
      if (typeof Intl.Locale === "function") {
        const region = new Intl.Locale(raw).region;
        if (region) return String(region).toUpperCase();
      }
    } catch {
      // Ignore locale parsing failures and continue with regex fallback.
    }

    const normalized = raw.replace("_", "-");
    const match = normalized.match(/-([A-Za-z]{2})(?:-|$)/);
    return match ? String(match[1]).toUpperCase() : "";
  };

  const localeCandidates = [
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language,
    Intl.DateTimeFormat().resolvedOptions().locale,
  ].filter(Boolean) as string[];

  for (const locale of localeCandidates) {
    const region = getLocaleRegion(locale);
    if (region && supportedCodes.has(region)) return region;
  }

  const timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "").trim();
  const timezoneCountryMap: Record<string, string> = {
    "Europe/London": "GB",
    "Europe/Berlin": "DE",
    "Europe/Paris": "FR",
    "Europe/Rome": "IT",
    "Europe/Madrid": "ES",
    "Europe/Lisbon": "PT",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Dublin": "IE",
    "Europe/Vienna": "AT",
    "Europe/Stockholm": "SE",
    "Europe/Copenhagen": "DK",
    "Europe/Helsinki": "FI",
    "Europe/Warsaw": "PL",
    "Europe/Bucharest": "RO",
    "Europe/Prague": "CZ",
    "Europe/Athens": "GR",
    "Europe/Budapest": "HU",
    "Europe/Bratislava": "SK",
    "Europe/Ljubljana": "SI",
    "Europe/Sofia": "BG",
    "Europe/Zagreb": "HR",
    "Europe/Nicosia": "CY",
    "Europe/Vilnius": "LT",
    "Europe/Riga": "LV",
    "Europe/Tallinn": "EE",
    "Europe/Luxembourg": "LU",
    "Europe/Malta": "MT",
    "Africa/Johannesburg": "ZA",
    "America/New_York": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Los_Angeles": "US",
  };

  const timezoneCountry = timezoneCountryMap[timezone];
  if (timezoneCountry && supportedCodes.has(timezoneCountry)) return timezoneCountry;

  return "DE";
}

async function resolveSenderCountryCodeFromIp(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const supportedCodes = new Set(SENDER_COUNTRIES.map((country) => country.code));
  const fetchWithTimeout = async (url: string, timeoutMs = 2500): Promise<JsonRecord | null> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  // Primary provider.
  const ipApiData = await fetchWithTimeout("https://ipapi.co/json/");
  const ipApiCode = String(ipApiData?.country_code ?? "").toUpperCase();
  if (ipApiCode && supportedCodes.has(ipApiCode)) return ipApiCode;

  // Secondary fallback provider.
  const ipWhoData = await fetchWithTimeout("https://ipwho.is/");
  const ipWhoCode = String(ipWhoData?.country_code ?? "").toUpperCase();
  if (ipWhoCode && supportedCodes.has(ipWhoCode)) return ipWhoCode;

  return null;
}

function extractErrorMessage(error: unknown, fallback = "Request failed"): string {
  const err = error as any;
  return err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || fallback;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
  window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
}

function looksLikeZimbabweNumber(phone: string): boolean {
  const raw = String(phone || "").replace(/\s+/g, "");
  return /^\+2637\d{8}$/.test(raw) || /^2637\d{8}$/.test(raw) || /^07\d{8}$/.test(raw);
}

function normalizeZimbabweNumber(phone: string): string {
  const raw = String(phone || "").replace(/\s+/g, "");
  if (/^\+2637\d{8}$/.test(raw)) return raw;
  if (/^2637\d{8}$/.test(raw)) return `+${raw}`;
  if (/^07\d{8}$/.test(raw)) return `+263${raw.slice(1)}`;
  return raw;
}

function isImmediateValueTransfer(type: TransferType | ""): type is "airtime_topup" | "prepaid_electricity" {
  return type === "airtime_topup" || type === "prepaid_electricity";
}

function formatAmount(value: number | string | null | undefined, currency: string): string {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return `0.00 ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

function toAmountInputString(value: number | string | null | undefined): string {
  const amount = parseAmountInput(value);
  if (amount === null || amount <= 0) return "";
  return amount.toFixed(2);
}

function isMultipleOfTen(value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const remainder = Math.abs(value % 10);
  return remainder < 1e-9 || Math.abs(remainder - 10) < 1e-9;
}

function normalizeToTenStep(value: number | string | null | undefined): string {
  const amount = parseAmountInput(value);
  if (amount === null || amount <= 0) return "";
  const normalized = Math.max(10, Math.round(amount / 10) * 10);
  return String(normalized);
}

function parseAmountInput(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toFinancialNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractProviderFee(payload: JsonRecord | null | undefined, sendingAmount?: number): number | null {
  if (!payload || typeof payload !== "object") return null;
  const normalizedSendingAmount = typeof sendingAmount === "number" && Number.isFinite(sendingAmount) ? sendingAmount : null;

  const directCandidates = [
    payload.fee,
    payload.totalFee,
    payload.feeAmount,
    payload.serviceFee,
    payload.senderFee,
    payload.charges?.total,
    payload.charges?.fee,
    payload.pricing?.fee,
    payload.priceBreakdown?.fee,
    payload.fees?.total,
    payload.fees?.sender,
  ];

  for (const candidate of directCandidates) {
    const parsed = toFinancialNumber(candidate);
    if (parsed !== null && parsed >= 0) return parsed;
  }

  if (Array.isArray(payload.fees)) {
    const feeSum = payload.fees.reduce((sum: number, item: any) => {
      const parsed = toFinancialNumber(item?.amount ?? item?.fee ?? item?.value);
      return parsed !== null && parsed >= 0 ? sum + parsed : sum;
    }, 0);
    if (feeSum > 0) return feeSum;
  }

  const totalPayable = toFinancialNumber(
    payload.totalPayableAmount ?? payload.totalAmount ?? payload.payInAmount ?? payload.senderAmountTotal
  );
  if (
    totalPayable !== null &&
    normalizedSendingAmount !== null &&
    normalizedSendingAmount >= 0 &&
    totalPayable >= normalizedSendingAmount
  ) {
    return totalPayable - normalizedSendingAmount;
  }

  return null;
}

function extractFxRate(payload: JsonRecord | null | undefined, sendingAmount?: number): number | null {
  if (!payload || typeof payload !== "object") return null;

  const directRate = toFinancialNumber(payload.fxRate ?? payload.exchangeRate);
  if (directRate !== null && directRate > 0) return directRate;

  const normalizedSendingAmount = typeof sendingAmount === "number" && Number.isFinite(sendingAmount) ? sendingAmount : null;
  const receivingAmount = toFinancialNumber(
    payload.receivingAmount ?? payload.recipientAmount ?? payload.amountReceived ?? payload.payoutAmount
  );

  if (
    normalizedSendingAmount !== null &&
    normalizedSendingAmount > 0 &&
    receivingAmount !== null &&
    receivingAmount > 0
  ) {
    return receivingAmount / normalizedSendingAmount;
  }

  return null;
}

function buildReloadlyAirtimePricing(operator: JsonRecord | null | undefined, options: JsonRecord | null | undefined): ReloadlyPricing | null {
  const senderCurrencyCode = String(options?.senderCurrencyCode ?? operator?.senderCurrencyCode ?? "").trim().toUpperCase();
  const destinationCurrencyCode = String(options?.destinationCurrencyCode ?? operator?.destinationCurrencyCode ?? "").trim().toUpperCase();
  const fxRate = toFinancialNumber(options?.fxRate ?? options?.fx?.rate ?? operator?.fxRate ?? operator?.fx?.rate);
  const fee = toFinancialNumber(options?.fee);

  if (!senderCurrencyCode || !destinationCurrencyCode || fxRate === null || fxRate <= 0) return null;

  return {
    source: "airtime_topup",
    senderCurrencyCode,
    destinationCurrencyCode,
    destinationLabel: "They receive",
    fxRate: Number(fxRate.toFixed(6)),
    fee,
  };
}

function buildReloadlyUtilityPricing(biller: JsonRecord | null | undefined): ReloadlyPricing | null {
  const senderCurrencyCode = String(biller?.internationalTransactionCurrencyCode ?? biller?.fx?.currencyCode ?? "").trim().toUpperCase();
  const destinationCurrencyCode = String(biller?.localTransactionCurrencyCode ?? "").trim().toUpperCase() || "VALUE";
  const fxRate = toFinancialNumber(biller?.fx?.rate);
  const fee = toFinancialNumber(biller?.internationalTransactionFee ?? biller?.localTransactionFee);

  if (!senderCurrencyCode || fxRate === null || fxRate <= 0) return null;

  return {
    source: "prepaid_electricity",
    senderCurrencyCode,
    destinationCurrencyCode,
    destinationLabel: "Meter value",
    fxRate: Number(fxRate.toFixed(6)),
    fee,
  };
}

export default function SendMoneyForm({ forcedTransferType = null }: SendMoneyFormProps) {
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const defaultSenderCodeRef = useRef<string>(resolveDefaultSenderCountryCode());
  const [form, setForm] = useState<SendMoneyFormState>(() => {
    const defaultSender =
      SENDER_COUNTRIES.find((country) => country.code === defaultSenderCodeRef.current) ||
      SENDER_COUNTRIES.find((country) => country.code === INITIAL_FORM.senderCountryCode) ||
      SENDER_COUNTRIES[0]!;

    return {
      ...INITIAL_FORM,
      senderCountryCode: defaultSender.code,
      currencyFrom: defaultSender.currency,
    };
  });
  const [step, setStep] = useState<FormStep>("route");
  const [amountMode, setAmountMode] = useState<AmountMode>("send");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<JsonRecord | null>(null);
  const [status, setStatus] = useState<SendMoneyStatus | null>(null);
  const [error, setError] = useState("");
  const [baselineFxRate, setBaselineFxRate] = useState<number | null>(null);
  const [airtimeOperator, setAirtimeOperator] = useState<AirtimeOperator>(null);
  const [airtimeOptions, setAirtimeOptions] = useState<Array<number | string>>([]);
  const [airtimeFeeQuote, setAirtimeFeeQuote] = useState(0);
  const [utilityBillers, setUtilityBillers] = useState<UtilityBiller[]>([]);
  const [reloadlyPricing, setReloadlyPricing] = useState<ReloadlyPricing | null>(null);
  const liveQuoteRequestRef = useRef<number>(0);

  useEffect(() => {
    let active = true;

    const detectAndApplyCountry = async () => {
      const detectedCountryCode = await resolveSenderCountryCodeFromIp();
      if (!active || !detectedCountryCode) return;
      const detectedSender = SENDER_COUNTRIES.find((country) => country.code === detectedCountryCode);
      if (!detectedSender) return;

      setForm((prev) => {
        // Do not override a user/manual selection.
        if (prev.senderCountryCode !== defaultSenderCodeRef.current) return prev;
        if (prev.senderCountryCode === detectedSender.code && prev.currencyFrom === detectedSender.currency) return prev;
        return {
          ...prev,
          senderCountryCode: detectedSender.code,
          currencyFrom: detectedSender.currency,
        };
      });
    };

    void detectAndApplyCountry();
    return () => {
      active = false;
    };
  }, []);

  const senderCountries = useMemo<Country[]>(
    () =>
      SENDER_COUNTRIES.map((country) => ({
        ...country,
        name: getLocalizedRegionName(country.code, i18n.language, country.name),
      })),
    [i18n.language]
  );

  const receiverCountry = useMemo<Country>(
    () => ({
      ...RECEIVER_COUNTRY,
      name: getLocalizedRegionName(RECEIVER_COUNTRY.code, i18n.language, RECEIVER_COUNTRY.name),
    }),
    [i18n.language]
  );

  const selectedSender = useMemo<Country>(
    () => senderCountries.find((country) => country.code === form.senderCountryCode) || senderCountries[0]!,
    [form.senderCountryCode, senderCountries]
  );

  const amount = parseAmountInput(form.amountSent) ?? 0;
  const amountReceive = parseAmountInput(form.amountReceive) ?? 0;
  const isReloadlyTransfer = isImmediateValueTransfer(form.transferType);
  const providerCharge = useMemo(() => {
    const quotedFee = extractProviderFee(quote, amount);
    if (quotedFee !== null && quotedFee >= 0) return Number(quotedFee.toFixed(2));

    if (form.transferType === "airtime_topup") {
      const topupFee = extractProviderFee(status?.providerResponse?.topup, amount);
      if (topupFee !== null && topupFee >= 0) return Number(topupFee.toFixed(2));

      if (reloadlyPricing?.source === "airtime_topup" && reloadlyPricing.fee !== null && reloadlyPricing.fee >= 0) {
        return Number(reloadlyPricing.fee.toFixed(2));
      }

      if (airtimeFeeQuote > 0) return Number(airtimeFeeQuote.toFixed(2));

      return 0;
    }

    if (form.transferType === "prepaid_electricity") {
      const utilityFee = extractProviderFee(status?.providerResponse?.payment, amount);
      if (utilityFee !== null && utilityFee >= 0) return Number(utilityFee.toFixed(2));
      if (reloadlyPricing?.source === "prepaid_electricity" && reloadlyPricing.fee !== null && reloadlyPricing.fee >= 0) {
        return Number(reloadlyPricing.fee.toFixed(2));
      }
      return 0;
    }
    return 0;
  }, [airtimeFeeQuote, amount, form.transferType, quote, reloadlyPricing, status]);
  const fee = useMemo(() => Number(providerCharge.toFixed(2)), [providerCharge]);
  const totalCharge = useMemo(() => Number((amount + fee).toFixed(2)), [amount, fee]);
  const quotedReceiveAmount = Number(quote?.receivingAmount || 0);
  const quoteFxRate = extractFxRate(quote, amount) ?? 0;
  const inputDerivedFxRate =
    amount > 0 && Number.isFinite(amountReceive) && amountReceive > 0
      ? Number((amountReceive / amount).toFixed(6))
      : 0;
  const reloadlyFxRate = isReloadlyTransfer ? Number(reloadlyPricing?.fxRate ?? 0) : 0;
  const fxRate = useMemo(() => {
    if (isReloadlyTransfer) {
      if (Number.isFinite(reloadlyFxRate) && reloadlyFxRate > 0) return Number(reloadlyFxRate.toFixed(6));
      return 0;
    }
    if (Number.isFinite(quoteFxRate) && quoteFxRate > 0) return Number(quoteFxRate.toFixed(6));
    if (Number.isFinite(inputDerivedFxRate) && inputDerivedFxRate > 0) return inputDerivedFxRate;
    if (Number.isFinite(baselineFxRate) && (baselineFxRate ?? 0) > 0) return Number((baselineFxRate ?? 0).toFixed(6));
    return 0;
  }, [baselineFxRate, inputDerivedFxRate, isReloadlyTransfer, quoteFxRate, reloadlyFxRate]);
  const estimatedReceive = Number(
    quotedReceiveAmount || (amountReceive > 0 ? amountReceive : amount * (fxRate || 1))
  );
  const displayedReceiveAmount = Number((amountReceive > 0 ? amountReceive : estimatedReceive).toFixed(2));
  const liveAmountInput = amountMode === "send" ? form.amountSent : form.amountReceive;
  const displaySendCurrency = isReloadlyTransfer
    ? reloadlyPricing?.senderCurrencyCode || form.currencyFrom
    : form.currencyFrom;
  const displayReceiveCurrency = form.transferType === "prepaid_electricity"
    ? reloadlyPricing?.destinationCurrencyCode || "VALUE"
    : isReloadlyTransfer
      ? reloadlyPricing?.destinationCurrencyCode || form.currencyTo
      : form.currencyTo;
  const receiveAmountLabel =
    form.transferType === "prepaid_electricity"
      ? tr("payments.form.fields.utility_value", "Meter value")
      : tr("payments.form.fields.they_receive", "They receive");
  const showRouteSummary =
    form.transferType === "send_money" ||
    ((form.transferType === "airtime_topup" || form.transferType === "prepaid_electricity") && fxRate > 0);
  const reloadlyReceiveInputDisabled = isReloadlyTransfer && !(fxRate > 0);

  const requestQuote = async (sendingAmount: number): Promise<JsonRecord | null> => {
    const response = await api.post("/fintech/remittance/quote", {
      amountSent: Number(sendingAmount),
      currencyFrom: String(form.currencyFrom).toUpperCase(),
      currencyTo: String(form.currencyTo).toUpperCase(),
      receivingCountry: String(form.receiverCountryCode).toUpperCase(),
    });
    const payload = response?.data as JsonRecord | undefined;
    return (payload?.fxQuote as JsonRecord | undefined) ?? (payload?.quote as JsonRecord | undefined) ?? payload ?? null;
  };

  useEffect(() => {
    let active = true;

    if (form.transferType !== "send_money") {
      setBaselineFxRate(null);
      return () => {
        active = false;
      };
    }

    if (quoteFxRate > 0 || inputDerivedFxRate > 0) {
      setBaselineFxRate(null);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const previewQuote = await requestQuote(FX_RATE_PREVIEW_AMOUNT);
        if (!active || !previewQuote) return;

        const previewFxRate = extractFxRate(previewQuote, FX_RATE_PREVIEW_AMOUNT);
        if (active) {
          setBaselineFxRate(previewFxRate && previewFxRate > 0 ? Number(previewFxRate.toFixed(6)) : null);
        }
      } catch {
        if (active) setBaselineFxRate(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [
    form.currencyFrom,
    form.currencyTo,
    form.receiverCountryCode,
    form.transferType,
    inputDerivedFxRate,
    quoteFxRate,
  ]);

  useEffect(() => {
    if (form.currencyFrom !== selectedSender.currency) {
      setForm((prev) => ({ ...prev, currencyFrom: selectedSender.currency }));
    }
  }, [form.currencyFrom, selectedSender.currency]);

  useEffect(() => {
    if (form.currencyTo !== RECEIVER_COUNTRY.currency) {
      setForm((prev) => ({ ...prev, currencyTo: RECEIVER_COUNTRY.currency }));
    }
  }, [form.currencyTo]);

  useEffect(() => {
    if (forcedTransferType !== "send_money" && forcedTransferType !== "airtime_topup" && forcedTransferType !== "prepaid_electricity") return;
    setForm((prev) => {
      if (prev.transferType === forcedTransferType) return prev;
      return {
        ...prev,
        transferType: forcedTransferType,
      };
    });
    setError("");
    setStep("route");
  }, [forcedTransferType]);

  useEffect(() => {
    if (form.transferType === "send_money") {
      if (reloadlyPricing !== null) setReloadlyPricing(null);
      return;
    }
    if (form.transferType === "airtime_topup" && reloadlyPricing?.source === "prepaid_electricity") {
      setReloadlyPricing(null);
      return;
    }
    if (form.transferType === "prepaid_electricity" && reloadlyPricing?.source === "airtime_topup") {
      setReloadlyPricing(null);
    }
  }, [form.transferType, reloadlyPricing]);

  useEffect(() => {
    if (step !== "route" || form.transferType !== "send_money") {
      return;
    }

    const sendInput = parseAmountInput(form.amountSent) ?? 0;
    const receiveInput = parseAmountInput(form.amountReceive) ?? 0;
    const rawInput = parseAmountInput(liveAmountInput) ?? 0;
    if (rawInput <= 0) {
      setQuote((prev) => (prev ? null : prev));
      return;
    }

    if (amountMode === "receive" && !isMultipleOfTen(receiveInput)) return;

    const sendingAmount = amountMode === "send" ? sendInput : receiveInput;
    if (!Number.isFinite(sendingAmount) || sendingAmount <= 0 || sendingAmount > 5000) return;

    const requestId = liveQuoteRequestRef.current + 1;
    liveQuoteRequestRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        if (amountMode === "receive") {
          const firstQuote = await requestQuote(Number(sendingAmount.toFixed(2)));
          if (!firstQuote || liveQuoteRequestRef.current !== requestId) return;

          const firstRate = extractFxRate(firstQuote, Number(sendingAmount.toFixed(2))) ?? 0;
          if (!Number.isFinite(firstRate) || firstRate <= 0) return;

          const derivedSendAmount = Number((receiveInput / firstRate).toFixed(2));
          if (!Number.isFinite(derivedSendAmount) || derivedSendAmount <= 0 || derivedSendAmount > 5000) return;

          const finalQuote = await requestQuote(derivedSendAmount);
          if (!finalQuote || liveQuoteRequestRef.current !== requestId) return;
          setQuote(finalQuote);

          const finalRate = extractFxRate(finalQuote, derivedSendAmount) ?? 0;
          if (!Number.isFinite(finalRate) || finalRate <= 0) return;

          setForm((prev) => {
            if (
              prev.transferType !== "send_money" &&
              prev.transferType !== "airtime_topup" &&
              prev.transferType !== "prepaid_electricity"
            ) {
              return prev;
            }
            const normalizedReceive =
              prev.transferType === "send_money"
                ? normalizeToTenStep(receiveInput)
                : toAmountInputString(receiveInput);
            const nextSend = toAmountInputString(Number(normalizedReceive || 0) / finalRate);
            const nextReceive = normalizedReceive || prev.amountReceive;
            if (nextSend && nextSend !== prev.amountSent) {
              return { ...prev, amountSent: nextSend, amountReceive: nextReceive };
            }
            return prev;
          });
          return;
        }

        const liveQuote = await requestQuote(Number(sendingAmount.toFixed(2)));
        if (!liveQuote || liveQuoteRequestRef.current !== requestId) return;
        setQuote(liveQuote);

        const liveRate = extractFxRate(liveQuote, Number(sendingAmount.toFixed(2))) ?? 0;
        setForm((prev) => {
          if (
            prev.transferType !== "send_money" &&
            prev.transferType !== "airtime_topup" &&
            prev.transferType !== "prepaid_electricity"
          ) {
            return prev;
          }
          const rawReceive = Number(liveQuote?.receivingAmount ?? Number(prev.amountSent || 0) * (liveRate || 1));
          const nextReceive =
            prev.transferType === "send_money" ? normalizeToTenStep(rawReceive) : toAmountInputString(rawReceive);
          if (nextReceive && nextReceive !== prev.amountReceive) {
            return { ...prev, amountReceive: nextReceive };
          }
          return prev;
        });
      } catch {
        // Keep typing UX smooth; explicit quote action still surfaces errors.
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [
    amountMode,
    form.currencyFrom,
    form.currencyTo,
    form.receiverCountryCode,
    form.transferType,
    liveAmountInput,
    step,
  ]);

  useEffect(() => {
    if (step !== "payout" || form.transferType !== "airtime_topup" || !looksLikeZimbabweNumber(form.recipientPhone)) {
      setAirtimeOperator(null);
      setAirtimeOptions([]);
      setAirtimeFeeQuote(0);
      if (reloadlyPricing?.source === "airtime_topup") setReloadlyPricing(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const normalized = normalizeZimbabweNumber(form.recipientPhone);
        const detectResponse = await api.post("/fintech/airtime/operator/detect", { phoneNumber: normalized });
        const detectPayload = detectResponse?.data as { operator?: AirtimeOperator } | undefined;
        setAirtimeOperator(detectPayload?.operator ?? null);

        const optionsResponse = await api.post("/fintech/airtime/options", { phoneNumber: normalized });
        const optionsPayload = optionsResponse?.data as { options?: JsonRecord } | undefined;
        const options = optionsPayload?.options ?? {};
        const suggested = options?.suggestedAmounts || [];
        setAirtimeOptions(Array.isArray(suggested) ? suggested : []);
        const parsedFee = extractProviderFee(options);
        setAirtimeFeeQuote(parsedFee !== null && parsedFee >= 0 ? Number(parsedFee.toFixed(2)) : 0);
        const pricing = buildReloadlyAirtimePricing(detectPayload?.operator ?? null, options);
        setReloadlyPricing(pricing);
        if (pricing?.fxRate && amount > 0) {
          setForm((prev) => {
            if (prev.transferType !== "airtime_topup") return prev;
            if (amountMode === "send") {
              const nextReceive = toAmountInputString(amount * pricing.fxRate);
              return nextReceive !== prev.amountReceive ? { ...prev, amountReceive: nextReceive } : prev;
            }
            if (amountMode === "receive" && amountReceive > 0) {
              const nextSend = toAmountInputString(amountReceive / pricing.fxRate);
              return nextSend !== prev.amountSent ? { ...prev, amountSent: nextSend } : prev;
            }
            return prev;
          });
        }
      } catch {
        setAirtimeOperator(null);
        setAirtimeOptions([]);
        setAirtimeFeeQuote(0);
        if (reloadlyPricing?.source === "airtime_topup") setReloadlyPricing(null);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [amount, amountMode, amountReceive, form.recipientPhone, form.transferType, reloadlyPricing?.source, step]);

  useEffect(() => {
    if (step !== "payout" || form.transferType !== "prepaid_electricity") {
      setUtilityBillers([]);
      if (reloadlyPricing?.source === "prepaid_electricity") setReloadlyPricing(null);
      return;
    }

    let active = true;

    void (async () => {
      try {
        const response = await api.post("/fintech/utility/electricity/options", {
          countryISOCode: "ZW",
        });
        if (!active) return;
        const billers = Array.isArray(response?.data?.billers) ? response.data.billers : [];
        setUtilityBillers(billers);
        setForm((prev) => {
          if (prev.transferType !== "prepaid_electricity") return prev;
          const firstBillerId = String(billers[0]?.id ?? "").trim();
          if (prev.utilityBillerId || !firstBillerId) return prev;
          return {
            ...prev,
            utilityBillerId: firstBillerId,
          };
        });
      } catch {
        if (active) {
          setUtilityBillers([]);
          if (reloadlyPricing?.source === "prepaid_electricity") setReloadlyPricing(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [form.transferType, reloadlyPricing?.source, step]);

  useEffect(() => {
    if (form.transferType !== "prepaid_electricity") return;
    const selectedBiller =
      utilityBillers.find((biller) => String(biller?.id ?? "").trim() === form.utilityBillerId) ?? utilityBillers[0] ?? null;
    const pricing = buildReloadlyUtilityPricing(selectedBiller);
    setReloadlyPricing(pricing);

    if (pricing?.fxRate && amount > 0) {
      setForm((prev) => {
        if (prev.transferType !== "prepaid_electricity") return prev;
        if (amountMode === "send") {
          const nextReceive = toAmountInputString(amount * pricing.fxRate);
          return nextReceive !== prev.amountReceive ? { ...prev, amountReceive: nextReceive } : prev;
        }
        if (amountMode === "receive" && amountReceive > 0) {
          const nextSend = toAmountInputString(amountReceive / pricing.fxRate);
          return nextSend !== prev.amountSent ? { ...prev, amountSent: nextSend } : prev;
        }
        return prev;
      });
    }
  }, [amount, amountMode, amountReceive, form.transferType, form.utilityBillerId, utilityBillers]);

  const update = (key: keyof SendMoneyFormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value } as SendMoneyFormState));

  const updateAmountSent = (value: string) => {
    setAmountMode("send");
    setForm((prev) => {
      const parsed = parseAmountInput(value);
      const next = { ...prev, amountSent: value };
      if ((prev.transferType === "send_money" || isImmediateValueTransfer(prev.transferType)) && parsed !== null && parsed > 0) {
        if (!(fxRate > 0)) {
          next.amountReceive = "";
          return next;
        }
        next.amountReceive =
          prev.transferType === "send_money"
            ? normalizeToTenStep(parsed * fxRate)
            : toAmountInputString(parsed * fxRate);
      } else if (parsed !== null && parsed > 0 && fxRate > 0) {
        next.amountReceive = toAmountInputString(parsed * fxRate);
      } else if (!value) {
        next.amountReceive = "";
      }
      return next;
    });
  };

  const updateAmountReceive = (value: string) => {
    setAmountMode("receive");
    setForm((prev) => {
      const parsed = parseAmountInput(value);
      const next = { ...prev, amountReceive: value };

      if (prev.transferType === "send_money") {
        if (!value) {
          next.amountSent = "";
          return next;
        }

        if (parsed === null || parsed <= 0) {
          return prev;
        }

        const normalizedReceive = isMultipleOfTen(parsed) ? String(Math.round(parsed)) : normalizeToTenStep(parsed);
        next.amountReceive = normalizedReceive;
        const normalizedValue = Number(normalizedReceive);

        const effectiveRate = fxRate > 0 ? fxRate : 1;
        next.amountSent = toAmountInputString(normalizedValue / effectiveRate);
        return next;
      }

      if (isImmediateValueTransfer(prev.transferType)) {
        if (!value) {
          next.amountSent = "";
          return next;
        }

        if (parsed === null || parsed <= 0) {
          return prev;
        }

        if (!(fxRate > 0)) {
          next.amountSent = "";
          return next;
        }

        next.amountSent = toAmountInputString(parsed / fxRate);
      } else if (parsed !== null && parsed > 0 && fxRate > 0) {
        next.amountSent = toAmountInputString(parsed / fxRate);
      } else if (!value) {
        next.amountSent = "";
      }
      return next;
    });
  };

  const onReceiveAmountBlur = () => {
    if (form.transferType !== "send_money") return;
    const normalized = normalizeToTenStep(form.amountReceive);
    if (!normalized) return;
    const currentReceive = parseAmountInput(form.amountReceive);
    if (currentReceive !== null && !isMultipleOfTen(currentReceive)) {
      updateAmountReceive(normalized);
    }
  };

  const canStart = useMemo(() => {
    if (amountMode === "receive") {
      if (!Number.isFinite(amountReceive) || amountReceive <= 0) return false;
      if (form.transferType === "send_money") return isMultipleOfTen(amountReceive);
      if (isImmediateValueTransfer(form.transferType)) return fxRate > 0;
      return true;
    }
    return Number.isFinite(amount) && amount > 0 && amount <= 5000;
  }, [amount, amountMode, amountReceive, form.transferType, fxRate]);

  const showGetStartedButton = useMemo(() => {
    const hasTransferSelection =
      form.transferType === "send_money" ||
      form.transferType === "airtime_topup" ||
      form.transferType === "prepaid_electricity";
    if (!hasTransferSelection) return false;
    const activeAmount = amountMode === "receive" ? amountReceive : amount;
    return Number.isFinite(activeAmount) && activeAmount > 0;
  }, [amount, amountMode, amountReceive, form.transferType]);

  const canContinueRecipient = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone);
    }
    if (form.transferType === "prepaid_electricity") {
      return String(form.meterNumber).trim().length >= 5;
    }
    return (
      String(form.recipientName).trim().length >= 2 &&
      String(form.recipientAddress).trim().length >= 4 &&
      looksLikeZimbabweNumber(form.recipientPhone)
    );
  }, [form.recipientAddress, form.recipientName, form.recipientPhone, form.transferType]);

  const canContinuePayout = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone) && amount > 0 && fxRate > 0;
    }
    if (form.transferType === "prepaid_electricity") {
      return Boolean(String(form.utilityBillerId).trim()) && amount > 0 && fxRate > 0;
    }

    if (form.recipientType === "mobile_money") {
      return looksLikeZimbabweNumber(form.mobileNumber || form.recipientPhone);
    }
    if (form.recipientType === "cash_pickup") {
      return Boolean(String(form.payoutChannel).trim() && String(form.cashPickupLocation).trim());
    }
    if (form.recipientType === "visa_card") {
      return Boolean(
        String(form.cardNumber).trim() &&
          String(form.cardExpiryMonth).trim() &&
          String(form.cardExpiryYear).trim() &&
          String(form.cardHolderName).trim()
      );
    }
    return false;
  }, [amount, form]);

  const buildRemittancePayload = () => ({
    recipientName: form.recipientName,
    recipientType: form.recipientType,
    provider: form.recipientType === "mobile_money" ? "EcoCash" : "TerraPay",
    payoutChannel: form.recipientType === "cash_pickup" ? form.payoutChannel : undefined,
    amountSent: parseAmountInput(form.amountSent) ?? 0,
    currencyFrom: String(form.currencyFrom).toUpperCase(),
    currencyTo: String(form.currencyTo).toUpperCase(),
    receivingCountry: String(form.receiverCountryCode).toUpperCase(),
    recipient: {
      mobileNumber: normalizeZimbabweNumber(form.mobileNumber || form.recipientPhone),
      cashPickupLocation: form.cashPickupLocation,
      cardNumber: form.cardNumber,
      cardExpiryMonth: form.cardExpiryMonth,
      cardExpiryYear: form.cardExpiryYear,
      cardHolderName: form.cardHolderName,
    },
  });

  const ensureAuthenticated = async (): Promise<boolean> => {
    try {
      const response = await api.get("/auth/me");
      const payload = response?.data as { user?: JsonRecord } | undefined;
      if (payload?.user) return true;
      throw new Error(tr("payments.form.errors.auth_required", "Authentication required."));
    } catch (err) {
      const statusCode = Number((err as any)?.response?.status ?? 0);
      if (statusCode === 401) {
        setError(
          tr(
            "payments.form.errors.login_required_steps",
            "Please log in to continue with recipient, payout, payment, and receipt steps."
          )
        );
        redirectToLogin();
        return false;
      }
      throw err;
    }
  };

  const onGetStarted = async () => {
    setLoading(true);
    setError("");
    try {
      if (
        form.transferType !== "send_money" &&
        form.transferType !== "airtime_topup" &&
        form.transferType !== "prepaid_electricity"
      ) {
        throw new Error(
          tr(
            "payments.form.transfer.required_hint",
            "Select Send Money, Airtime Top-up, or Prepaid Electricity to continue."
          )
        );
      }

      const sendInput = parseAmountInput(form.amountSent) ?? 0;
      const receiveInput = parseAmountInput(form.amountReceive) ?? 0;

      if (isImmediateValueTransfer(form.transferType)) {
        let normalizedSendAmount = sendInput;

        if (amountMode === "receive") {
          if (!(fxRate > 0)) {
            throw new Error(
              tr(
                "payments.form.errors.reloadly_pricing_pending",
                "Provider pricing becomes available after recipient details. Enter the amount you want to send to continue."
              )
            );
          }
          normalizedSendAmount = Number((receiveInput / fxRate).toFixed(2));
        }

        if (!Number.isFinite(normalizedSendAmount) || normalizedSendAmount <= 0) {
          throw new Error(tr("payments.form.errors.invalid_amount", "Enter a valid amount."));
        }
        if (normalizedSendAmount > 5000) {
          throw new Error(tr("payments.form.errors.amount_limit", "Amount exceeds permitted limit of 5000."));
        }

        const normalizedReceiveAmount =
          fxRate > 0
            ? Number((normalizedSendAmount * fxRate).toFixed(2))
            : Number(receiveInput > 0 ? receiveInput : 0);

        setForm((prev) => ({
          ...prev,
          amountSent: toAmountInputString(normalizedSendAmount),
          amountReceive: normalizedReceiveAmount > 0 ? toAmountInputString(normalizedReceiveAmount) : prev.amountReceive,
        }));
        setQuote(null);
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) return;
        setStep("recipient");
        return;
      }

      let normalizedSendAmount = sendInput;
      let quoteResult = null;

      if (amountMode === "receive" && Number.isFinite(receiveInput) && receiveInput > 0) {
        if (!isMultipleOfTen(receiveInput)) {
          throw new Error(tr("payments.form.errors.receive_multiple_ten", "Receiver amount must be in 10 USD increments."));
        }
        const initialGuess = Number.isFinite(sendInput) && sendInput > 0 ? sendInput : receiveInput;
        const firstQuote = await requestQuote(initialGuess);
        const quoteRate = extractFxRate(firstQuote, initialGuess) ?? 0;
        normalizedSendAmount = quoteRate > 0 ? Number((receiveInput / quoteRate).toFixed(2)) : Number(initialGuess.toFixed(2));
        if (normalizedSendAmount > 5000) {
          throw new Error(tr("payments.form.errors.amount_limit", "Amount exceeds permitted limit of 5000."));
        }
        quoteResult = await requestQuote(normalizedSendAmount);
      } else {
        if (!Number.isFinite(normalizedSendAmount) || normalizedSendAmount <= 0) {
          throw new Error(tr("payments.form.errors.invalid_amount", "Enter a valid amount."));
        }
        normalizedSendAmount = Number(normalizedSendAmount.toFixed(2));
        quoteResult = await requestQuote(normalizedSendAmount);
      }

      const normalizedReceiveAmount = Number(
        quoteResult?.receivingAmount || (receiveInput > 0 ? receiveInput : normalizedSendAmount)
      );
      const normalizedReceiveDisplay =
        form.transferType === "send_money"
          ? normalizeToTenStep(normalizedReceiveAmount)
          : toAmountInputString(normalizedReceiveAmount);

      setForm((prev) => ({
        ...prev,
        amountSent: toAmountInputString(normalizedSendAmount),
        amountReceive: normalizedReceiveDisplay,
      }));
      setQuote(quoteResult);
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;
      setStep("recipient");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_fetch_quote", "Unable to fetch FX quote.")));
    } finally {
      setLoading(false);
    }
  };

  const onContinueRecipient = async () => {
    setLoading(true);
    setError("");
    try {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;

      if (form.transferType === "prepaid_electricity") {
        setForm((prev) => ({
          ...prev,
          recipientName: prev.utilityCustomerName || prev.recipientName,
        }));
      } else {
        const normalizedPhone = normalizeZimbabweNumber(form.recipientPhone);
        setForm((prev) => ({
          ...prev,
          recipientPhone: normalizedPhone,
          mobileNumber: prev.mobileNumber || normalizedPhone,
          cashPickupLocation: prev.cashPickupLocation || `${prev.recipientCity} ${prev.recipientAddress}`.trim(),
        }));
      }
      setStep("payout");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_verify_session", "Unable to verify your session.")));
    } finally {
      setLoading(false);
    }
  };

  const onContinuePayout = async () => {
    setLoading(true);
    setError("");
    try {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;
      setStep("pay");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_verify_session", "Unable to verify your session.")));
    } finally {
      setLoading(false);
    }
  };

  const onPay = async () => {
    setLoading(true);
    setError("");
    try {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;

      if (form.transferType === "airtime_topup") {
        const response = await api.post("/fintech/airtime/topup", {
          phoneNumber: normalizeZimbabweNumber(form.recipientPhone),
          amount: parseAmountInput(form.amountSent) ?? 0,
          currency: displaySendCurrency,
        });
        setStatus({
          kind: "airtime",
          transaction: response.data?.transaction ?? null,
          providerResponse: response.data?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        });
      } else if (form.transferType === "prepaid_electricity") {
        const response = await api.post("/fintech/utility/electricity/pay", {
          meterNumber: String(form.meterNumber).trim(),
          amount: parseAmountInput(form.amountSent) ?? 0,
          currency: displaySendCurrency,
          customerName: String(form.utilityCustomerName).trim() || undefined,
          billerId: Number(form.utilityBillerId),
        });
        setStatus({
          kind: "utility",
          transaction: response.data?.transaction ?? null,
          providerResponse: response.data?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        });
      } else {
        const response = await api.post("/fintech/remittance/send", buildRemittancePayload());
        setStatus({
          kind: "remittance",
          transaction: response.data?.transaction ?? null,
          providerResponse: response.data?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        });
      }
      setStep("status");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_complete_payment", "Unable to complete payment.")));
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    if (!status) return;

    const submittedAt = new Date(status.submittedAt || Date.now());
    const payoutLabel =
      form.transferType === "airtime_topup"
        ? "Airtime Top-up"
        : form.transferType === "prepaid_electricity"
          ? "Prepaid Electricity"
        : tr(PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelKey || "payments.form.payout_types.mobile_money", PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelFallback || form.recipientType) || form.recipientType;
    const transaction = status.transaction || {};
    const ref =
      transaction.terrapay_reference ||
      transaction.reloadly_reference ||
      status.providerResponse?.transfer?.reference ||
      "Pending";

    const lines = [
      tr("payments.form.receipt.title", "Diaspora Unlocked - Payment Receipt"),
      "==================================",
      `${tr("payments.form.receipt.date", "Date")}: ${submittedAt.toISOString()}`,
      `${tr("payments.form.receipt.sender_country", "Sender Country")}: ${selectedSender.name} (${selectedSender.currency})`,
      `${tr("payments.form.receipt.receiver_country", "Receiver Country")}: ${receiverCountry.name}`,
      `${tr("payments.form.receipt.recipient", "Recipient")}: ${form.transferType === "prepaid_electricity" ? form.utilityCustomerName || "Meter Holder" : form.recipientName}`,
      `${tr("payments.form.receipt.address", "Address")}: ${form.transferType === "prepaid_electricity" ? String(form.meterNumber).trim() : `${form.recipientAddress}${form.recipientCity ? `, ${form.recipientCity}` : ""}`}`,
      `${tr("payments.form.receipt.phone", "Phone")}: ${form.transferType === "prepaid_electricity" ? "-" : normalizeZimbabweNumber(form.recipientPhone)}`,
      `${tr("payments.form.receipt.payout_method", "Payout Method")}: ${payoutLabel}`,
      `${tr("payments.form.receipt.amount_sent", "Amount Sent")}: ${formatAmount(amount, displaySendCurrency)}`,
      `${tr("payments.form.fee", "Fee")}: ${formatAmount(fee, displaySendCurrency)}`,
      `${tr("payments.form.total", "Total")}: ${formatAmount(totalCharge, displaySendCurrency)}`,
      `${tr("payments.form.quote.fx_rate", "FX Rate")}: ${fxRate > 0 ? `1 ${displaySendCurrency} = ${fxRate.toFixed(6)} ${displayReceiveCurrency}` : tr("payments.form.quote.na", "N/A")}`,
      `${tr("payments.form.quote.estimated_receive", "Estimated Receive")}: ${formatAmount(estimatedReceive, displayReceiveCurrency)}`,
      `${tr("payments.form.receipt.transaction_id", "Transaction ID")}: ${transaction.id || tr("payments.form.status.pending_title", "Pending")}`,
      `${tr("payments.form.status.reference", "Reference")}: ${ref}`,
      `${tr("payments.form.status.status", "Status")}: ${transaction.status || tr("payments.form.status.pending", "pending")}`,
      "",
      tr("payments.receipt.disclaimer_line_1", "Payments are powered by licensed financial infrastructure providers."),
      tr("payments.receipt.disclaimer_line_2", "Diaspora Unlocked does not hold customer funds."),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payment-receipt-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onNewTransfer = () => {
    setError("");
    setQuote(null);
    setStatus(null);
    setAirtimeOperator(null);
    setAirtimeOptions([]);
    setAirtimeFeeQuote(0);
    setUtilityBillers([]);
    setReloadlyPricing(null);
    setAmountMode("send");
    setForm((prev) => ({
      ...INITIAL_FORM,
      senderCountryCode: prev.senderCountryCode,
      currencyFrom: prev.currencyFrom,
    }));
    setStep("route");
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/70 focus:border-zim-gold/60";
  const stepPillClass =
    "flex min-w-0 h-10 items-center justify-center rounded-full border px-2 text-center text-[8px] font-black uppercase leading-tight tracking-[0.08em] md:px-3 md:text-[10px] md:leading-none md:tracking-widest";
  const pillActionBaseClass =
    "inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest leading-tight transition";
  const pillSecondaryClass =
    `${pillActionBaseClass} border border-white/20 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]`;
  const pillPrimaryClass =
    `${pillActionBaseClass} bg-zim-gold text-zim-black hover:bg-white disabled:opacity-60`;
  const pillSuccessClass =
    `${pillActionBaseClass} border border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-300/15`;
  const optionPillClass =
    "inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors";

  const getLocalizedReflectWindow = (payoutType: PayoutEtaTarget) => {
    if (payoutType === "airtime_topup") {
      return tr("payments.form.eta.airtime", "Usually within minutes.");
    }
    if (payoutType === "prepaid_electricity") {
      return tr("payments.form.eta.prepaid_electricity", "Usually within minutes after provider confirmation.");
    }
    if (payoutType === "mobile_money") {
      return tr("payments.form.eta.mobile_money", "Usually within minutes to 2 hours.");
    }
    if (payoutType === "cash_pickup") {
      return tr("payments.form.eta.cash_pickup", "Usually within 1 hour after provider confirmation.");
    }
    if (payoutType === "visa_card") {
      return tr("payments.form.eta.visa_card", "Can take minutes to up to 24 hours.");
    }
    return tr("payments.form.eta.default", "Timings depend on provider processing windows.");
  };

  const currentStepIndex = FLOW_STEPS.findIndex((item) => item.id === step);
  const payoutEta = getLocalizedReflectWindow(
    form.transferType === "airtime_topup"
      ? "airtime_topup"
      : form.transferType === "prepaid_electricity"
        ? "prepaid_electricity"
        : form.recipientType
  );

  return (
    <section className="outer-glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 text-white shadow-[0_20px_40px_rgba(2,6,23,0.45)]">
      <div className="relative mb-5">
        <div className="relative z-10 text-center">
          <div className="mb-5 flex items-center justify-center gap-3">
            <HandCoins className="h-6 w-6 text-zim-gold" />
            <h3 className="text-xl font-black tracking-tight">{tr("payments.form.title", "Send Money")}</h3>
          </div>
          <p className="text-sm text-white/70">
            {tr(
              "payments.form.subtitle.",
              "Send your money easy, fast and securely from the comfort of your home to Zimbabwe."
            )}
          </p>
        </div>
      </div>

      <div className="mb-12 grid grid-cols-5 gap-2">
        {FLOW_STEPS.map((item, index) => {
          const active = currentStepIndex >= index;
          return (
            <div
              key={item.id}
              className={`${stepPillClass} ${
                active
                  ? "border-zim-gold/50 bg-zim-gold/20 text-zim-gold"
                  : "border-white/10 bg-white/[0.02] text-white/70"
              }`}
            >
              {tr(item.labelKey, item.labelFallback)}
            </div>
          );
        })}
      </div>

      {step === "route" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.fields.sender_country", "Where are you sending from?")}
              </label>
              <select
                className={fieldClass}
                value={form.senderCountryCode}
                onChange={(e) => update("senderCountryCode", e.target.value)}
              >
                {senderCountries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.fields.receiver_country", "Receiver country")}
              </label>
              <select className={fieldClass} value={form.receiverCountryCode} disabled>
                <option value={RECEIVER_COUNTRY.code}>
                  {receiverCountry.flag} {receiverCountry.name} ({receiverCountry.currency})
                </option>
              </select>
            </div>
          </div>

          <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr(
                  "payments.form.fields.transfer_type",
                  "Select Send Money, Airtime Top-up, or Prepaid Electricity to continue."
                )}
              </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {TRANSFER_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = form.transferType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => update("transferType", type.value)}
                    data-testid={`transfer-type-${type.value}`}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {tr(type.labelKey, type.labelFallback)}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-current/70">
                      {tr(type.descriptionKey, type.descriptionFallback)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {(form.transferType === "send_money" ||
            form.transferType === "airtime_topup" ||
            form.transferType === "prepaid_electricity") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.fields.you_send", "You send")} ({displaySendCurrency})
                </label>
                <div className="relative">
                  <input
                    className={`${fieldClass} pr-16`}
                    type="number"
                    min="1"
                    max="5000"
                    value={form.amountSent}
                    onChange={(e) => updateAmountSent(e.target.value)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/70">
                    {displaySendCurrency}
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {receiveAmountLabel} ({displayReceiveCurrency})
                </label>
                <div className="relative">
                  <input
                    className={`${fieldClass} pr-16 text-xs`}
                    type="number"
                    min={form.transferType === "send_money" ? "10" : "1"}
                    step={form.transferType === "send_money" ? "10" : "0.01"}
                    placeholder={
                      form.transferType === "send_money"
                        ? tr("payments.form.fields.receive_placeholder", "Payout can only be in multiples of 10USD.")
                        : reloadlyReceiveInputDisabled
                          ? tr("payments.form.fields.reloadly_receive_pending", "Pricing appears after provider details are confirmed.")
                          : ""
                    }
                    value={form.amountReceive}
                    onChange={(e) => updateAmountReceive(e.target.value)}
                    onBlur={onReceiveAmountBlur}
                    readOnly={reloadlyReceiveInputDisabled}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/70">
                    {displayReceiveCurrency}
                  </span>
                </div>
              </div>
            </div>
          )}

          {showRouteSummary && (
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.quote.fx_rate", "FX Rate")}
                </p>
                <p className="mt-1 text-sm font-semibold text-white/85">
                  {fxRate > 0
                    ? `1 ${displaySendCurrency} = ${fxRate.toFixed(6)} ${displayReceiveCurrency}`
                    : tr("payments.form.quote.na", "N/A")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.fee", "Fee")}
                </p>
                <p className="mt-1 text-sm font-black text-white">{formatAmount(fee, displaySendCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.total", "Total")}
                </p>
                <p className="mt-1 text-sm font-black text-zim-gold">{formatAmount(totalCharge, displaySendCurrency)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.eta", "Estimated reflect time")}
                </p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-white/85">
                  <Clock3 className="h-4 w-4 text-zim-gold" />
                  {payoutEta}
                </p>
              </div>
            </div>
          )}

          {showGetStartedButton ? (
            <button
              data-testid="payments-get-started"
              className={`${pillPrimaryClass} gap-2 px-5 disabled:cursor-not-allowed`}
              disabled={loading || !canStart}
              onClick={onGetStarted}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading
                ? tr("payments.form.actions.loading_rate", "Loading Rate")
                : tr("payments.form.actions.get_started", "Get Started")}
            </button>
          ) : null}
        </div>
      )}

      {step === "recipient" && (
        <div className="space-y-5">
          {form.transferType === "send_money" ? (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.full_name", "Receiver full name")}
                </label>
                <input className={fieldClass} value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.address", "Receiver address")}
                </label>
                <input
                  className={fieldClass}
                  placeholder={tr("payments.form.recipient.address_placeholder", "Street / Suburb")}
                  value={form.recipientAddress}
                  onChange={(e) => update("recipientAddress", e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.city", "City")}
                  </label>
                  <input className={fieldClass} value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.phone", "Phone number")}
                  </label>
                  <input
                    className={fieldClass}
                    placeholder="+2637XXXXXXXX"
                    value={form.recipientPhone}
                    onChange={(e) => update("recipientPhone", e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : form.transferType === "airtime_topup" ? (
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.recipient.airtime_number", "Airtime number")}
              </label>
              <input
                className={fieldClass}
                placeholder="+2637XXXXXXXX"
                value={form.recipientPhone}
                onChange={(e) => update("recipientPhone", e.target.value)}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.utility.meter_number", "Meter number")}
                </label>
                <input
                  className={fieldClass}
                  value={form.meterNumber}
                  onChange={(e) => update("meterNumber", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.utility.customer_name", "Customer name")}
                </label>
                <input
                  className={fieldClass}
                  value={form.utilityCustomerName}
                  onChange={(e) => update("utilityCustomerName", e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              className={pillSecondaryClass}
              onClick={() => setStep("route")}
            >
              {tr("payments.form.actions.back", "Back")}
            </button>
            <button
              className={pillPrimaryClass}
              onClick={onContinueRecipient}
              disabled={loading || !canContinueRecipient}
            >
              {tr("payments.form.actions.continue", "Continue")}
            </button>
          </div>
        </div>
      )}

      {step === "payout" && (
        <div className="space-y-5">
          {form.transferType === "send_money" && (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.payout.method", "Payout method")}
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PAYOUT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const selected = form.recipientType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => update("recipientType", type.value)}
                      className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                        selected
                          ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                      }`}
                    >
                      <Icon className="mb-2 h-4 w-4" />
                      <div className="text-xs font-bold uppercase tracking-wider">
                        {tr(type.labelKey, type.labelFallback)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.transferType === "send_money" && form.recipientType === "mobile_money" && (
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.payout.ecocash_number", "EcoCash Number")}
              </label>
              <input
                className={fieldClass}
                placeholder="+2637XXXXXXXX"
                value={form.mobileNumber}
                onChange={(e) => update("mobileNumber", e.target.value)}
              />
            </div>
          )}

          {form.transferType === "send_money" && form.recipientType === "cash_pickup" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.pickup_channel", "Pickup Channel")}
                </label>
                <select className={fieldClass} value={form.payoutChannel} onChange={(e) => update("payoutChannel", e.target.value)}>
                  <option value="">{tr("payments.form.payout.select_channel", "Select channel")}</option>
                  {CASH_PICKUP_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.pickup_location", "Pickup Location")}
                </label>
                <input className={fieldClass} value={form.cashPickupLocation} onChange={(e) => update("cashPickupLocation", e.target.value)} />
              </div>
            </div>
          )}

          {form.transferType === "send_money" && form.recipientType === "visa_card" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.card_number", "Card Number")}
                </label>
                <input className={fieldClass} value={form.cardNumber} onChange={(e) => update("cardNumber", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.expiry_month", "Expiry (MM)")}
                </label>
                <input className={fieldClass} value={form.cardExpiryMonth} onChange={(e) => update("cardExpiryMonth", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.expiry_year", "Expiry (YYYY)")}
                </label>
                <input className={fieldClass} value={form.cardExpiryYear} onChange={(e) => update("cardExpiryYear", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.card_holder", "Card Holder Name")}
                </label>
                <input className={fieldClass} value={form.cardHolderName} onChange={(e) => update("cardHolderName", e.target.value)} />
              </div>
            </div>
          )}

          {form.transferType === "airtime_topup" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
                <p>
                  {tr("payments.form.airtime.operator", "Operator")}:{" "}
                  <span className="font-semibold text-zim-gold">
                    {airtimeOperator?.name || tr("payments.form.airtime.detecting", "Auto-detecting...")}
                  </span>
                </p>
              </div>
              <div className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.airtime.options", "Top-up amount options")}
                </span>
                <div className="flex flex-wrap gap-2">
                  {airtimeOptions.length > 0 ? (
                    airtimeOptions.slice(0, 8).map((value) => (
                      <button
                        key={String(value)}
                        className={`${optionPillClass} ${
                          (parseAmountInput(form.amountReceive) ?? 0) === Number(value)
                            ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                            : "border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/[0.07]"
                        }`}
                        onClick={() => {
                          const normalized = toAmountInputString(value);
                          setAmountMode("receive");
                          setForm((prev) => ({
                            ...prev,
                            amountReceive: normalized,
                            amountSent: fxRate > 0 ? toAmountInputString(Number(value) / fxRate) : "",
                          }));
                        }}
                        type="button"
                      >
                        {value}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-white/70">
                      {tr("payments.form.airtime.no_options", "No suggested amounts yet.")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {form.transferType === "prepaid_electricity" && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.utility.provider", "Electricity provider")}
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {utilityBillers.length > 0 ? (
                    utilityBillers.map((biller) => {
                      const billerId = String(biller?.id ?? "").trim();
                      const selected = form.utilityBillerId === billerId;
                      return (
                        <button
                          key={billerId || String(biller?.name ?? "utility-biller")}
                          type="button"
                          onClick={() => update("utilityBillerId", billerId)}
                          className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                            selected
                              ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                              : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="text-xs font-bold uppercase tracking-wider">
                            {String(biller?.name ?? tr("payments.form.utility.default_biller", "Electricity Provider"))}
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
                      {tr("payments.form.utility.loading_billers", "Loading electricity providers...")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              className={pillSecondaryClass}
              onClick={() => setStep("recipient")}
              disabled={loading}
            >
              {tr("payments.form.actions.back", "Back")}
            </button>
            <button
              className={pillPrimaryClass}
              onClick={onContinuePayout}
              disabled={loading || !canContinuePayout}
            >
              {tr("payments.form.actions.continue_to_pay", "Continue to Pay")}
            </button>
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-white/70">
              {tr("payments.form.pay.summary", "Payment Summary")}
            </h4>
            <div className="grid gap-2 text-sm text-white/80">
              <p>
                {tr("payments.form.quote.route", "Route")}:{" "}
                <span className="font-semibold text-white">
                  {selectedSender.name} {tr("payments.form.quote.to", "to")} {receiverCountry.name}
                </span>
              </p>
              <p>
                {tr("payments.form.pay.recipient", "Recipient")}:{" "}
                <span className="font-semibold text-white">
                  {form.transferType === "prepaid_electricity"
                    ? form.utilityCustomerName || tr("payments.form.utility.meter_holder", "Meter holder")
                    : form.recipientName}
                </span>
              </p>
              <p>
                {form.transferType === "prepaid_electricity"
                  ? tr("payments.form.utility.meter_number", "Meter number")
                  : tr("payments.form.pay.phone", "Phone")}
                :{" "}
                <span className="font-semibold text-white">
                  {form.transferType === "prepaid_electricity"
                    ? form.meterNumber
                    : normalizeZimbabweNumber(form.recipientPhone)}
                </span>
              </p>
              <p>
                {tr("payments.form.pay.method", "Method")}:{" "}
                <span className="font-semibold text-white">
                  {form.transferType === "airtime_topup"
                    ? tr("payments.form.transfer_types.airtime_topup.label", "Airtime Top-up")
                    : form.transferType === "prepaid_electricity"
                      ? tr("payments.form.transfer_types.prepaid_electricity.label", "Prepaid Electricity")
                    : tr(
                        PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelKey || "payments.form.payout_types.mobile_money",
                        PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelFallback || form.recipientType
                      )}
                </span>
              </p>
              <p>
                {tr("payments.form.fields.you_send", "You send")}:{" "}
                <span className="font-semibold text-white">{formatAmount(amount, form.currencyFrom)}</span>
              </p>
              <p>
                {tr("payments.form.fee", "Fee")}:{" "}
                <span className="font-semibold text-white">{formatAmount(fee, form.currencyFrom)}</span>
              </p>
              <p>
                {tr("payments.form.total", "Total")}:{" "}
                <span className="font-semibold text-zim-gold">{formatAmount(totalCharge, form.currencyFrom)}</span>
              </p>
              <p>
                {tr("payments.form.fields.they_receive", "They receive")}:{" "}
                <span className="font-semibold text-zim-gold">
                  {formatAmount(displayedReceiveAmount, displayReceiveCurrency)}
                </span>
              </p>
              {form.transferType === "prepaid_electricity" ? (
                <p>
                  {tr("payments.form.utility.provider", "Electricity provider")}:{" "}
                  <span className="font-semibold text-white">
                    {utilityBillers.find((biller) => String(biller?.id ?? "").trim() === form.utilityBillerId)?.name ||
                      tr("payments.form.utility.default_biller", "Electricity Provider")}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-zim-gold/30 bg-zim-gold/10 p-4 text-xs text-zim-gold/90">
            <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" />
              {tr("payments.form.pay.settlement_timing", "Settlement timing")}
            </div>
            {payoutEta}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              className={pillSecondaryClass}
              onClick={() => setStep("payout")}
              disabled={loading}
            >
              {tr("payments.form.actions.edit", "Edit")}
            </button>
            <button
              className={`${pillPrimaryClass} gap-2`}
              onClick={onPay}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading
                ? tr("payments.form.actions.processing", "Processing")
                : tr("payments.form.actions.pay_now", "Pay Now")}
            </button>
          </div>
        </div>
      )}

      {step === "status" && status && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <h4 className="text-sm font-black uppercase tracking-widest">
              {tr("payments.form.status.submitted", "Payment Submitted")}
            </h4>
          </div>
          <div className="text-sm text-emerald-100">
            <p>
              {tr("payments.form.status.status", "Status")}: {status.transaction?.status || tr("payments.form.status.pending", "pending")}
            </p>
            <p>
              {tr("payments.form.status.reference", "Reference")}:{" "}
              {status.transaction?.terrapay_reference ||
                status.transaction?.reloadly_reference ||
                tr("payments.form.status.pending_title", "Pending")}
            </p>
            {status.transaction?.token_code ? (
              <p>
                {tr("payments.form.utility.token_code", "Token code")}: {status.transaction.token_code}
              </p>
            ) : null}
            <p>
              {tr("payments.form.fields.you_send", "You send")}: {formatAmount(amount, form.currencyFrom)}
            </p>
            <p>
              {tr("payments.form.fields.they_receive", "They receive")}:{" "}
              {formatAmount(displayedReceiveAmount, form.currencyTo)}
            </p>
            <p className="mt-1 text-emerald-200/85">
              {payoutEta}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={pillSuccessClass}
              onClick={downloadReceipt}
            >
              {tr("payments.form.actions.download_receipt", "Download Receipt")}
            </button>
            <button
              className={pillSecondaryClass}
              onClick={onNewTransfer}
            >
              {tr("payments.form.actions.new_transfer", "New Transfer")}
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <p className="mt-5 text-[11px] leading-relaxed text-white/70">
        {tr(
          "payments.disclaimer",
          "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds."
        )}
      </p>
    </section>
  );
}
