import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { api } from "../lib/api";

const CASH_PICKUP_CHANNELS = [
  "HelloPaisa",
  "Quest Financial Services",
  "ZB Bank",
  "CBZ",
  "BancABC",
  "Steward Bank",
  "Mukuru",
];

const SENDER_COUNTRIES = [
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

const RECEIVER_COUNTRY = { code: "ZW", flag: "🇿🇼", name: "Zimbabwe", currency: "USD" };

const TRANSFER_TYPES = [
  { value: "send_money", label: "Send Money", icon: ArrowRightLeft },
  { value: "airtime_topup", label: "Airtime Top-up", icon: Wallet },
];

const PAYOUT_TYPES = [
  { value: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { value: "cash_pickup", label: "Cash Pickup", icon: Landmark },
  { value: "visa_card", label: "Visa Card", icon: CreditCard },
];

const FLOW_STEPS = [
  { id: "route", label: "Route" },
  { id: "quote", label: "FX Rate" },
  { id: "recipient", label: "Recipient" },
  { id: "payout", label: "Payout" },
  { id: "pay", label: "Pay" },
  { id: "status", label: "Receipt" },
];

const INITIAL_FORM = {
  transferType: "send_money",
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
  recipientType: "mobile_money",
  payoutChannel: "",
  mobileNumber: "",
  cashPickupLocation: "",
  cardNumber: "",
  cardExpiryMonth: "",
  cardExpiryYear: "",
  cardHolderName: "",
};

function resolveDefaultSenderCountryCode() {
  if (typeof window === "undefined") return "DE";

  const supportedCodes = new Set(SENDER_COUNTRIES.map((country) => country.code));

  const getLocaleRegion = (localeValue) => {
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
  ].filter(Boolean);

  for (const locale of localeCandidates) {
    const region = getLocaleRegion(locale);
    if (region && supportedCodes.has(region)) return region;
  }

  const timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone ?? "").trim();
  const timezoneCountryMap = {
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

function extractErrorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const nextPath = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
  window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
}

function looksLikeZimbabweNumber(phone) {
  const raw = String(phone || "").replace(/\s+/g, "");
  return /^\+2637\d{8}$/.test(raw) || /^2637\d{8}$/.test(raw) || /^07\d{8}$/.test(raw);
}

function normalizeZimbabweNumber(phone) {
  const raw = String(phone || "").replace(/\s+/g, "");
  if (/^\+2637\d{8}$/.test(raw)) return raw;
  if (/^2637\d{8}$/.test(raw)) return `+${raw}`;
  if (/^07\d{8}$/.test(raw)) return `+263${raw.slice(1)}`;
  return raw;
}

function getReflectWindow(payoutType) {
  if (payoutType === "airtime_topup") return "Usually within minutes.";
  if (payoutType === "mobile_money") return "Usually within minutes to 2 hours.";
  if (payoutType === "cash_pickup") return "Usually within 1 hour after provider confirmation.";
  if (payoutType === "visa_card") return "Can take minutes to up to 24 hours.";
  return "Timings depend on provider processing windows.";
}

function formatAmount(value, currency) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return `0.00 ${currency}`;
  return `${amount.toFixed(2)} ${currency}`;
}

function toAmountInputString(value) {
  const amount = parseAmountInput(value);
  if (amount === null || amount <= 0) return "";
  return amount.toFixed(2);
}

function isMultipleOfTen(value) {
  if (!Number.isFinite(value)) return false;
  const remainder = Math.abs(value % 10);
  return remainder < 1e-9 || Math.abs(remainder - 10) < 1e-9;
}

function normalizeToTenStep(value) {
  const amount = parseAmountInput(value);
  if (amount === null || amount <= 0) return "";
  const normalized = Math.max(10, Math.round(amount / 10) * 10);
  return String(normalized);
}

function parseAmountInput(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toFinancialNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractProviderFee(payload, sendingAmount) {
  if (!payload || typeof payload !== "object") return null;

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
    const feeSum = payload.fees.reduce((sum, item) => {
      const parsed = toFinancialNumber(item?.amount ?? item?.fee ?? item?.value);
      return parsed !== null && parsed >= 0 ? sum + parsed : sum;
    }, 0);
    if (feeSum > 0) return feeSum;
  }

  const totalPayable = toFinancialNumber(
    payload.totalPayableAmount ?? payload.totalAmount ?? payload.payInAmount ?? payload.senderAmountTotal
  );
  if (totalPayable !== null && Number.isFinite(sendingAmount) && sendingAmount >= 0 && totalPayable >= sendingAmount) {
    return totalPayable - sendingAmount;
  }

  return null;
}

export default function SendMoneyForm() {
  const [form, setForm] = useState(() => {
    const defaultSenderCode = resolveDefaultSenderCountryCode();
    const defaultSender =
      SENDER_COUNTRIES.find((country) => country.code === defaultSenderCode) ||
      SENDER_COUNTRIES.find((country) => country.code === INITIAL_FORM.senderCountryCode) ||
      SENDER_COUNTRIES[0];

    return {
      ...INITIAL_FORM,
      senderCountryCode: defaultSender.code,
      currencyFrom: defaultSender.currency,
    };
  });
  const [step, setStep] = useState("route");
  const [amountMode, setAmountMode] = useState("send");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [airtimeOperator, setAirtimeOperator] = useState(null);
  const [airtimeOptions, setAirtimeOptions] = useState([]);
  const [airtimeFeeQuote, setAirtimeFeeQuote] = useState(0);
  const liveQuoteRequestRef = useRef(0);

  const selectedSender = useMemo(
    () => SENDER_COUNTRIES.find((country) => country.code === form.senderCountryCode) || SENDER_COUNTRIES[0],
    [form.senderCountryCode]
  );

  const amount = parseAmountInput(form.amountSent) ?? 0;
  const amountReceive = parseAmountInput(form.amountReceive) ?? 0;
  const providerCharge = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      const topupFee = extractProviderFee(status?.providerResponse?.topup, amount);
      if (topupFee !== null && topupFee >= 0) return Number(topupFee.toFixed(2));

      if (airtimeFeeQuote > 0) return Number(airtimeFeeQuote.toFixed(2));

      // Fallback estimate until operator-specific Reloadly fee is available.
      if (amount > 0) return Number((amount * 0.02).toFixed(2));
      return 0;
    }

    const fee = extractProviderFee(quote, amount);
    if (fee !== null && fee >= 0) return Number(fee.toFixed(2));
    return 0;
  }, [airtimeFeeQuote, form.transferType, quote, status]);
  const fee = useMemo(() => Number(providerCharge.toFixed(2)), [providerCharge]);
  const totalCharge = useMemo(() => Number((amount + fee).toFixed(2)), [amount, fee]);
  const fxRate = Number(quote?.fxRate || quote?.exchangeRate || 0);
  const estimatedReceive = Number(
    quote?.receivingAmount || (amountReceive > 0 ? amountReceive : amount * (fxRate || 1))
  );
  const liveAmountInput = amountMode === "send" ? form.amountSent : form.amountReceive;

  const requestQuote = async (sendingAmount) => {
    const response = await api.post("/remittance/quote", {
      amountSent: Number(sendingAmount),
      currencyFrom: String(form.currencyFrom).toUpperCase(),
      currencyTo: String(form.currencyTo).toUpperCase(),
      receivingCountry: String(form.receiverCountryCode).toUpperCase(),
    });
    if (!response?.data?.success) {
      throw new Error(response?.data?.error?.message || "Quote preview failed");
    }
    return response.data.data?.fxQuote || null;
  };

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
    if (step !== "route" || form.transferType !== "send_money") return;

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

          const firstRate = Number(firstQuote?.fxRate || firstQuote?.exchangeRate || 0);
          if (!Number.isFinite(firstRate) || firstRate <= 0) return;

          const derivedSendAmount = Number((receiveInput / firstRate).toFixed(2));
          if (!Number.isFinite(derivedSendAmount) || derivedSendAmount <= 0 || derivedSendAmount > 5000) return;

          const finalQuote = await requestQuote(derivedSendAmount);
          if (!finalQuote || liveQuoteRequestRef.current !== requestId) return;
          setQuote(finalQuote);

          const finalRate = Number(finalQuote?.fxRate || finalQuote?.exchangeRate || 0);
          if (!Number.isFinite(finalRate) || finalRate <= 0) return;

          setForm((prev) => {
            if (prev.transferType !== "send_money") return prev;
            const nextSend = toAmountInputString(Number(prev.amountReceive || 0) / finalRate);
            if (nextSend && nextSend !== prev.amountSent) {
              return { ...prev, amountSent: nextSend };
            }
            return prev;
          });
          return;
        }

        const liveQuote = await requestQuote(Number(sendingAmount.toFixed(2)));
        if (!liveQuote || liveQuoteRequestRef.current !== requestId) return;
        setQuote(liveQuote);

        const liveRate = Number(liveQuote?.fxRate || liveQuote?.exchangeRate || 0);
        setForm((prev) => {
          if (prev.transferType !== "send_money") return prev;
          const rawReceive = Number(liveQuote?.receivingAmount ?? Number(prev.amountSent || 0) * (liveRate || 1));
          const nextReceive = normalizeToTenStep(rawReceive);
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
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const normalized = normalizeZimbabweNumber(form.recipientPhone);
        const detectResponse = await api.post("/airtime/operator/detect", { phoneNumber: normalized });
        if (detectResponse?.data?.success) {
          setAirtimeOperator(detectResponse.data.data.operator);
        }

        const optionsResponse = await api.post("/airtime/options", { phoneNumber: normalized });
        if (optionsResponse?.data?.success) {
          const options = optionsResponse.data.data?.options || {};
          const suggested = options?.suggestedAmounts || [];
          setAirtimeOptions(Array.isArray(suggested) ? suggested : []);
          const parsedFee = extractProviderFee(options);
          setAirtimeFeeQuote(parsedFee !== null && parsedFee >= 0 ? Number(parsedFee.toFixed(2)) : 0);
        }
      } catch {
        setAirtimeOperator(null);
        setAirtimeOptions([]);
        setAirtimeFeeQuote(0);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [form.recipientPhone, form.transferType, step]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateAmountSent = (value) => {
    setAmountMode("send");
    setForm((prev) => {
      const parsed = parseAmountInput(value);
      const next = { ...prev, amountSent: value };
      if (prev.transferType === "airtime_topup") {
        next.amountReceive = value;
      } else if (prev.transferType === "send_money" && parsed !== null && parsed > 0 && fxRate > 0) {
        next.amountReceive = normalizeToTenStep(parsed * fxRate);
      } else if (parsed !== null && parsed > 0 && fxRate > 0) {
        next.amountReceive = toAmountInputString(parsed * fxRate);
      } else if (!value) {
        next.amountReceive = "";
      }
      return next;
    });
  };

  const updateAmountReceive = (value) => {
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

        if (fxRate > 0) {
          next.amountSent = toAmountInputString(normalizedValue / fxRate);
        } else {
          next.amountSent = "";
        }
        return next;
      }

      if (prev.transferType === "airtime_topup") {
        next.amountSent = value;
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
      return true;
    }
    return Number.isFinite(amount) && amount > 0 && amount <= 5000;
  }, [amount, amountMode, amountReceive, form.transferType]);

  const canContinueRecipient = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone);
    }
    return (
      String(form.recipientName).trim().length >= 2 &&
      String(form.recipientAddress).trim().length >= 4 &&
      looksLikeZimbabweNumber(form.recipientPhone)
    );
  }, [form.recipientAddress, form.recipientName, form.recipientPhone, form.transferType]);

  const canContinuePayout = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone) && amount > 0;
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

  const ensureAuthenticated = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response?.data?.user) return true;
      throw new Error("Authentication required.");
    } catch (err) {
      const status = Number(err?.response?.status ?? 0);
      if (status === 401) {
        setError("Please log in to continue with recipient, payout, payment, and receipt steps.");
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
      const sendInput = parseAmountInput(form.amountSent) ?? 0;
      const receiveInput = parseAmountInput(form.amountReceive) ?? 0;

      if (form.transferType === "airtime_topup") {
        const airtimeAmount =
          amountMode === "receive"
            ? receiveInput || sendInput
            : sendInput || receiveInput;

        if (!Number.isFinite(airtimeAmount) || airtimeAmount <= 0) {
          throw new Error("Enter a valid amount.");
        }

        const normalizedAirtimeAmount = Number(airtimeAmount.toFixed(2));
        setForm((prev) => ({
          ...prev,
          amountSent: toAmountInputString(normalizedAirtimeAmount),
          amountReceive: toAmountInputString(normalizedAirtimeAmount),
        }));
        setQuote({
          fxRate: 1,
          exchangeRate: 1,
          receivingAmount: normalizedAirtimeAmount,
        });
        setStep("quote");
        return;
      }

      let normalizedSendAmount = sendInput;
      let quoteResult = null;

      if (amountMode === "receive" && Number.isFinite(receiveInput) && receiveInput > 0) {
        if (!isMultipleOfTen(receiveInput)) {
          throw new Error("Receiver amount must be in 10 USD increments.");
        }
        const initialGuess = Number.isFinite(sendInput) && sendInput > 0 ? sendInput : receiveInput;
        const firstQuote = await requestQuote(initialGuess);
        const quoteRate = Number(firstQuote?.fxRate || firstQuote?.exchangeRate || 0);
        normalizedSendAmount = quoteRate > 0 ? Number((receiveInput / quoteRate).toFixed(2)) : Number(initialGuess.toFixed(2));
        if (normalizedSendAmount > 5000) {
          throw new Error("Amount exceeds permitted limit of 5000.");
        }
        quoteResult = await requestQuote(normalizedSendAmount);
      } else {
        if (!Number.isFinite(normalizedSendAmount) || normalizedSendAmount <= 0) {
          throw new Error("Enter a valid amount.");
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
      setStep("quote");
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to fetch FX quote."));
    } finally {
      setLoading(false);
    }
  };

  const onAcceptRate = async () => {
    setLoading(true);
    setError("");
    try {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;
      setStep("recipient");
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to verify your session."));
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

      const normalizedPhone = normalizeZimbabweNumber(form.recipientPhone);
      setForm((prev) => ({
        ...prev,
        recipientPhone: normalizedPhone,
        mobileNumber: prev.mobileNumber || normalizedPhone,
        cashPickupLocation: prev.cashPickupLocation || `${prev.recipientCity} ${prev.recipientAddress}`.trim(),
      }));
      setStep("payout");
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to verify your session."));
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
      setError(extractErrorMessage(err, "Unable to verify your session."));
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
        const response = await api.post("/airtime/topup", {
          phoneNumber: normalizeZimbabweNumber(form.recipientPhone),
          amount: parseAmountInput(form.amountSent) ?? 0,
          currency: "USD",
        });
        if (!response?.data?.success) {
          throw new Error(response?.data?.error?.message || "Airtime top-up failed");
        }
        setStatus({
          kind: "airtime",
          transaction: response.data.data?.transaction ?? null,
          providerResponse: response.data.data?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        });
      } else {
        const response = await api.post("/remittance/send", buildRemittancePayload());
        if (!response?.data?.success) {
          throw new Error(response?.data?.error?.message || "Remittance failed");
        }
        setStatus({
          kind: "remittance",
          transaction: response.data.data?.transaction ?? null,
          providerResponse: response.data.data?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        });
      }
      setStep("status");
    } catch (err) {
      setError(extractErrorMessage(err, "Unable to complete payment."));
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
        : PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.label || form.recipientType;
    const transaction = status.transaction || {};
    const ref =
      transaction.terrapay_reference ||
      transaction.reloadly_reference ||
      status.providerResponse?.transfer?.reference ||
      "Pending";

    const lines = [
      "Diaspora Unlocked - Payment Receipt",
      "==================================",
      `Date: ${submittedAt.toISOString()}`,
      `Sender Country: ${selectedSender.name} (${selectedSender.currency})`,
      `Receiver Country: ${RECEIVER_COUNTRY.name}`,
      `Recipient: ${form.recipientName}`,
      `Address: ${form.recipientAddress}${form.recipientCity ? `, ${form.recipientCity}` : ""}`,
      `Phone: ${normalizeZimbabweNumber(form.recipientPhone)}`,
      `Payout Method: ${payoutLabel}`,
      `Amount Sent: ${formatAmount(amount, form.currencyFrom)}`,
      `Fee: ${formatAmount(fee, form.currencyFrom)}`,
      `Total: ${formatAmount(totalCharge, form.currencyFrom)}`,
      `FX Rate: ${fxRate > 0 ? fxRate.toFixed(6) : "N/A"}`,
      `Estimated Receive: ${formatAmount(estimatedReceive, form.currencyTo)}`,
      `Transaction ID: ${transaction.id || "Pending"}`,
      `Reference: ${ref}`,
      `Status: ${transaction.status || "pending"}`,
      "",
      "Payments are powered by licensed financial infrastructure providers.",
      "Diaspora Unlocked does not hold customer funds.",
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
    setAmountMode("send");
    setForm((prev) => ({
      ...INITIAL_FORM,
      senderCountryCode: prev.senderCountryCode,
      currencyFrom: prev.currencyFrom,
    }));
    setStep("route");
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-zim-gold/60";

  const currentStepIndex = FLOW_STEPS.findIndex((item) => item.id === step);

  return (
    <section className="outer-glass-panel rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 text-white">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-black tracking-tight">Send Money</h3>
          <p className="mt-1 text-sm text-white/60">
            UK and EU senders can transfer to Zimbabwe with secure provider-side processing.
          </p>
        </div>
        <div className="rounded-xl border border-zim-gold/30 bg-zim-gold/10 p-2">
          <ArrowRightLeft className="h-5 w-5 text-zim-gold" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-2 md:grid-cols-6">
        {FLOW_STEPS.map((item, index) => {
          const active = currentStepIndex >= index;
          return (
            <div
              key={item.id}
              className={`rounded-full border px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest ${
                active
                  ? "border-zim-gold/50 bg-zim-gold/20 text-zim-gold"
                  : "border-white/10 bg-white/[0.02] text-white/40"
              }`}
            >
              {item.label}
            </div>
          );
        })}
      </div>

      {step === "route" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">
                Where are you sending from?
              </label>
              <select
                className={fieldClass}
                value={form.senderCountryCode}
                onChange={(e) => update("senderCountryCode", e.target.value)}
              >
                {SENDER_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name} ({country.currency})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Receiver country</label>
              <select className={fieldClass} value={form.receiverCountryCode} disabled>
                <option value={RECEIVER_COUNTRY.code}>
                  {RECEIVER_COUNTRY.flag} {RECEIVER_COUNTRY.name} ({RECEIVER_COUNTRY.currency})
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">
                You send ({form.currencyFrom})
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
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/55">
                  {form.currencyFrom}
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">
                They receive ({RECEIVER_COUNTRY.currency})
              </label>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-16 text-xs`}
                  type="number"
                  min={form.transferType === "send_money" ? "10" : "1"}
                  step={form.transferType === "send_money" ? "10" : "0.01"}
                  placeholder={form.transferType === "send_money" ? "Payout can only be in multiples of 10USD." : ""}
                  value={form.amountReceive}
                  onChange={(e) => updateAmountReceive(e.target.value)}
                  onBlur={onReceiveAmountBlur}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/55">
                  {RECEIVER_COUNTRY.currency}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/40">What are you sending?</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRANSFER_TYPES.map((type) => {
                const Icon = type.icon;
                const selected = form.transferType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => update("transferType", type.value)}
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      selected
                        ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                        : "border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <div className="text-xs font-bold uppercase tracking-wider">{type.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Fee</p>
              <p className="mt-1 text-sm font-black text-white">{formatAmount(fee, form.currencyFrom)}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total</p>
              <p className="mt-1 text-sm font-black text-zim-gold">{formatAmount(totalCharge, form.currencyFrom)}</p>
            </div>
          </div>

          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zim-gold px-5 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !canStart}
            onClick={onGetStarted}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Loading Rate" : "Get Started"}
          </button>
        </div>
      )}

      {step === "quote" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-white/50">FX Rate Preview</h4>
            <div className="grid gap-2 text-sm text-white/80">
              <p>
                Route:{" "}
                <span className="font-semibold text-white">
                  {selectedSender.name} to Zimbabwe ({form.transferType === "airtime_topup" ? "Airtime Top-up" : "Send Money"})
                </span>
              </p>
              <p>
                Amount: <span className="font-semibold text-white">{formatAmount(amount, form.currencyFrom)}</span>
              </p>
              <p>
                FX Rate: <span className="font-semibold text-white">{fxRate > 0 ? fxRate.toFixed(6) : "N/A"}</span>
              </p>
              <p>
                Fee: <span className="font-semibold text-white">{formatAmount(fee, form.currencyFrom)}</span>
              </p>
              <p>
                Total: <span className="font-semibold text-zim-gold">{formatAmount(totalCharge, form.currencyFrom)}</span>
              </p>
              <p>
                Estimated receive:{" "}
                <span className="font-semibold text-zim-gold">{formatAmount(estimatedReceive, form.currencyTo)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zim-gold/30 bg-zim-gold/10 p-4 text-xs text-zim-gold/90">
            <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" />
              Security notice
            </div>
            {form.transferType === "airtime_topup"
              ? "Reloadly fees are confirmed once the operator is detected from the airtime number."
              : "Quote includes provider-side fees. Final payout timing depends on compliance checks and payout channel processing windows."}
          </div>

          <div className="flex gap-3">
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/[0.08]"
              onClick={() => setStep("route")}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="w-1/2 rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:opacity-60"
              onClick={onAcceptRate}
              disabled={loading || !quote}
            >
              Accept Rate
            </button>
          </div>
        </div>
      )}

      {step === "recipient" && (
        <div className="space-y-5">
          {form.transferType === "send_money" ? (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Receiver full name</label>
                <input className={fieldClass} value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Receiver address</label>
                <input
                  className={fieldClass}
                  placeholder="Street / Suburb"
                  value={form.recipientAddress}
                  onChange={(e) => update("recipientAddress", e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">City</label>
                  <input className={fieldClass} value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Phone number</label>
                  <input
                    className={fieldClass}
                    placeholder="+2637XXXXXXXX"
                    value={form.recipientPhone}
                    onChange={(e) => update("recipientPhone", e.target.value)}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Airtime number</label>
              <input
                className={fieldClass}
                placeholder="+2637XXXXXXXX"
                value={form.recipientPhone}
                onChange={(e) => update("recipientPhone", e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/[0.08]"
              onClick={() => setStep("quote")}
            >
              Back
            </button>
            <button
              className="w-1/2 rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:opacity-60"
              onClick={onContinueRecipient}
              disabled={loading || !canContinueRecipient}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "payout" && (
        <div className="space-y-5">
          {form.transferType === "send_money" && (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/40">Payout method</label>
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
                      <div className="text-xs font-bold uppercase tracking-wider">{type.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {form.transferType === "send_money" && form.recipientType === "mobile_money" && (
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">EcoCash Number</label>
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
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Pickup Channel</label>
                <select className={fieldClass} value={form.payoutChannel} onChange={(e) => update("payoutChannel", e.target.value)}>
                  <option value="">Select channel</option>
                  {CASH_PICKUP_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Pickup Location</label>
                <input className={fieldClass} value={form.cashPickupLocation} onChange={(e) => update("cashPickupLocation", e.target.value)} />
              </div>
            </div>
          )}

          {form.transferType === "send_money" && form.recipientType === "visa_card" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Card Number</label>
                <input className={fieldClass} value={form.cardNumber} onChange={(e) => update("cardNumber", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Expiry (MM)</label>
                <input className={fieldClass} value={form.cardExpiryMonth} onChange={(e) => update("cardExpiryMonth", e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Expiry (YYYY)</label>
                <input className={fieldClass} value={form.cardExpiryYear} onChange={(e) => update("cardExpiryYear", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/40">Card Holder Name</label>
                <input className={fieldClass} value={form.cardHolderName} onChange={(e) => update("cardHolderName", e.target.value)} />
              </div>
            </div>
          )}

          {form.transferType === "airtime_topup" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/80">
                <p>
                  Operator: <span className="font-semibold text-zim-gold">{airtimeOperator?.name || "Auto-detecting..."}</span>
                </p>
              </div>
              <div className="grid gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Top-up amount options</span>
                <div className="flex flex-wrap gap-2">
                  {airtimeOptions.length > 0 ? (
                    airtimeOptions.slice(0, 8).map((value) => (
                      <button
                        key={String(value)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          (parseAmountInput(form.amountSent) ?? 0) === Number(value)
                            ? "border-zim-gold/50 bg-zim-gold/15 text-zim-gold"
                            : "border-white/20 bg-white/[0.03] text-white/80 hover:bg-white/[0.07]"
                        }`}
                        onClick={() => {
                          const normalized = toAmountInputString(value);
                          setAmountMode("send");
                          setForm((prev) => ({
                            ...prev,
                            amountSent: normalized,
                            amountReceive: normalized,
                          }));
                        }}
                        type="button"
                      >
                        {value}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-white/45">No suggested amounts yet.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/[0.08]"
              onClick={() => setStep("recipient")}
              disabled={loading}
            >
              Back
            </button>
            <button
              className="w-1/2 rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black transition hover:bg-white disabled:opacity-60"
              onClick={onContinuePayout}
              disabled={loading || !canContinuePayout}
            >
              Continue to Pay
            </button>
          </div>
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-white/50">Payment Summary</h4>
            <div className="grid gap-2 text-sm text-white/80">
              <p>
                Route: <span className="font-semibold text-white">{selectedSender.name} to Zimbabwe</span>
              </p>
              <p>
                Recipient: <span className="font-semibold text-white">{form.recipientName}</span>
              </p>
              <p>
                Phone: <span className="font-semibold text-white">{normalizeZimbabweNumber(form.recipientPhone)}</span>
              </p>
              <p>
                Method:{" "}
                <span className="font-semibold text-white">
                  {form.transferType === "airtime_topup"
                    ? "Airtime Top-up"
                    : PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.label || form.recipientType}
                </span>
              </p>
              <p>
                Amount: <span className="font-semibold text-white">{formatAmount(amount, form.currencyFrom)}</span>
              </p>
              <p>
                Fee: <span className="font-semibold text-white">{formatAmount(fee, form.currencyFrom)}</span>
              </p>
              <p>
                Total: <span className="font-semibold text-zim-gold">{formatAmount(totalCharge, form.currencyFrom)}</span>
              </p>
              <p>
                Estimated receive: <span className="font-semibold text-zim-gold">{formatAmount(estimatedReceive, form.currencyTo)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zim-gold/30 bg-zim-gold/10 p-4 text-xs text-zim-gold/90">
            <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" />
              Settlement timing
            </div>
            {getReflectWindow(form.transferType === "airtime_topup" ? "airtime_topup" : form.recipientType)}
          </div>

          <div className="flex gap-3">
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/80 hover:bg-white/[0.08]"
              onClick={() => setStep("payout")}
              disabled={loading}
            >
              Edit
            </button>
            <button
              className="inline-flex w-1/2 items-center justify-center gap-2 rounded-full bg-zim-gold px-4 py-3 text-[11px] font-black uppercase tracking-widest text-zim-black hover:bg-white disabled:opacity-60"
              onClick={onPay}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Processing" : "Pay Now"}
            </button>
          </div>
        </div>
      )}

      {step === "status" && status && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <h4 className="text-sm font-black uppercase tracking-widest">Payment Submitted</h4>
          </div>
          <div className="text-sm text-emerald-100">
            <p>Status: {status.transaction?.status || "pending"}</p>
            <p>
              Reference:{" "}
              {status.transaction?.terrapay_reference || status.transaction?.reloadly_reference || "Pending"}
            </p>
            <p className="mt-1 text-emerald-200/85">
              {getReflectWindow(form.transferType === "airtime_topup" ? "airtime_topup" : form.recipientType)}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="w-1/2 rounded-full border border-emerald-300/40 bg-transparent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-300/15"
              onClick={downloadReceipt}
            >
              Download Receipt
            </button>
            <button
              className="w-1/2 rounded-full border border-white/20 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/90 hover:bg-white/[0.08]"
              onClick={onNewTransfer}
            >
              New Transfer
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

      <p className="mt-5 text-[11px] leading-relaxed text-white/50">
        Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.
      </p>
    </section>
  );
}
