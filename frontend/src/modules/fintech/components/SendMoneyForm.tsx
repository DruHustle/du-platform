import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  HandCoins,
  Landmark,
  Loader2,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { DEFAULT_SENDER_COUNTRIES, type SenderCountryConfig } from "@shared/fintechSenderCountries";
import { DEFAULT_RECEIVER_COUNTRIES, type ReceiverCountryConfig } from "@shared/fintechReceiverCountries";

type TransferType = "send_money" | "airtime_topup";
type RecipientType = "mobile_money" | "cash_pickup" | "bank_transfer";
type FormStep = "route" | "method" | "recipient" | "payout" | "pay" | "status";
type AmountMode = "send" | "receive";
type PayoutEtaTarget = RecipientType | "airtime_topup";
type Country = SenderCountryConfig;
type JsonRecord = Record<string, any>;
type AirtimeOperator = JsonRecord | null;
type ReloadlyPricing = {
  source: "airtime_topup";
  senderCurrencyCode: string;
  destinationCurrencyCode: string;
  destinationLabel: string;
  fxRate: number;
  fee: number | null;
};
type SendMoneyStatus = {
  kind: "airtime" | "remittance";
  transaction: JsonRecord | null;
  providerResponse: JsonRecord | null;
  submittedAt: string;
};
type TransferLimits = {
  maxPerTransaction: number;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
};
type SendMoneyFormState = {
  transferType: TransferType | "";
  senderCountryCode: string;
  receiverCountryCode: string;
  amountSent: string;
  amountReceive: string;
  currencyFrom: string;
  currencyTo: string;
  senderMsisdn: string;
  recipientFirstName: string;
  recipientMiddleName: string;
  recipientSurname: string;
  recipientAddress: string;
  recipientCity: string;
  recipientPhone: string;
  recipientType: RecipientType;
  payoutChannel: string;
  mobileNumber: string;
  cashPickupLocation: string;
  cardNumber: string;
  cardExpiryMonth: string;
  cardExpiryYear: string;
  cardHolderName: string;
  bankName: string;
  bankAccountNumber: string;
};
type SendMoneyFormProps = {
  forcedTransferType?: TransferType | null;
  forcedRecipientType?: RecipientType | null;
  showTransferTypeSelector?: boolean;
  onTransactionSubmitted?: () => void;
};

const FALLBACK_SUPPORTED_BANKS: string[] = ["ZB Bank", "CBZ", "BancABC", "Steward Bank"];
const FX_RATE_PREVIEW_AMOUNT = 100;
const FALLBACK_TRANSFER_LIMITS: TransferLimits = {
  maxPerTransaction: 5000,
  dailyLimit: 5000,
  weeklyLimit: 15000,
  monthlyLimit: 50000,
};

const FALLBACK_SENDER_COUNTRIES: Country[] = DEFAULT_SENDER_COUNTRIES;

type ReceiverCountry = ReceiverCountryConfig;
const RECEIVER_COUNTRIES: ReceiverCountry[] = DEFAULT_RECEIVER_COUNTRIES;
const DEFAULT_RECEIVER_COUNTRY: ReceiverCountry = RECEIVER_COUNTRIES[0]!; // Zimbabwe

// Module-level country detection cache with a 1-hour TTL so that locale or
// VPN changes are picked up after the expiry window without needing a page reload.
const COUNTRY_CACHE_TTL_MS = 60 * 60 * 1000;
type CountryCache = { code: string; cachedAt: number };
let detectedSenderCountryCodeCacheEntry: CountryCache | null = null;

function getCachedSenderCountryCode(): string | null {
  if (!detectedSenderCountryCodeCacheEntry) return null;
  if (Date.now() - detectedSenderCountryCodeCacheEntry.cachedAt > COUNTRY_CACHE_TTL_MS) {
    detectedSenderCountryCodeCacheEntry = null;
    return null;
  }
  return detectedSenderCountryCodeCacheEntry.code;
}

function setCachedSenderCountryCode(code: string): void {
  detectedSenderCountryCodeCacheEntry = { code, cachedAt: Date.now() };
}

function getSupportedSenderCountryCodeFromLocale(supportedCodes: Set<string>): string | null {
  if (typeof window === "undefined") return null;

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

  return null;
}

function getSupportedSenderCountryCodeFromTimezone(supportedCodes: Set<string>): string | null {
  if (typeof window === "undefined") return null;

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
  return timezoneCountry && supportedCodes.has(timezoneCountry) ? timezoneCountry : null;
}

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
    descriptionFallback: "Transfer to mobile money, cash pickup, or bank transfer.",
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
] as const;

const PAYOUT_TYPES = [
  { value: "mobile_money", labelKey: "payments.form.payout_types.mobile_money", labelFallback: "Mobile Money", icon: Smartphone },
  { value: "cash_pickup", labelKey: "payments.form.payout_types.cash_pickup", labelFallback: "Cash Pickup", icon: Landmark },
  { value: "bank_transfer", labelKey: "payments.form.payout_types.bank_transfer", labelFallback: "Bank Transfer", icon: Building2 },
] as const;

// Send money: Amount → Method → Recipient (+ delivery details) → Review → Done
const SEND_MONEY_STEPS = [
  { id: "route" as const, labelKey: "payments.form.steps.amount", labelFallback: "Amount" },
  { id: "method" as const, labelKey: "payments.form.steps.method", labelFallback: "Method" },
  { id: "recipient" as const, labelKey: "payments.form.steps.recipient", labelFallback: "Recipient" },
  { id: "pay" as const, labelKey: "payments.form.steps.review", labelFallback: "Review" },
  { id: "status" as const, labelKey: "payments.form.steps.done", labelFallback: "Done" },
];
// Send money with forced delivery method: Amount → Recipient → Review → Done
const SEND_MONEY_STEPS_FORCED = [
  { id: "route" as const, labelKey: "payments.form.steps.amount", labelFallback: "Amount" },
  { id: "recipient" as const, labelKey: "payments.form.steps.recipient", labelFallback: "Recipient" },
  { id: "pay" as const, labelKey: "payments.form.steps.review", labelFallback: "Review" },
  { id: "status" as const, labelKey: "payments.form.steps.done", labelFallback: "Done" },
];
// Airtime: Phone + Amount → Top-up options → Review → Done
const AIRTIME_STEPS = [
  { id: "route" as const, labelKey: "payments.form.steps.phone", labelFallback: "Phone" },
  { id: "payout" as const, labelKey: "payments.form.steps.topup", labelFallback: "Top-up" },
  { id: "pay" as const, labelKey: "payments.form.steps.review", labelFallback: "Review" },
  { id: "status" as const, labelKey: "payments.form.steps.done", labelFallback: "Done" },
];

const INITIAL_FORM: SendMoneyFormState = {
  transferType: "",
  senderCountryCode: "DE",
  receiverCountryCode: "ZW",
  amountSent: "",
  amountReceive: "",
  currencyFrom: "EUR",
  currencyTo: "USD",
  senderMsisdn: "",
  recipientFirstName: "",
  recipientMiddleName: "",
  recipientSurname: "",
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
  bankName: "",
  bankAccountNumber: "",
};

function resolveDefaultSenderCountryCode(countries: Country[]): string {
  const cached = getCachedSenderCountryCode();
  if (cached) return cached;
  if (typeof window === "undefined") return "DE";

  const supportedCodes = new Set(countries.map((country) => country.code));
  const timezoneCountry = getSupportedSenderCountryCodeFromTimezone(supportedCodes);
  if (timezoneCountry) return timezoneCountry;

  const localeCountry = getSupportedSenderCountryCodeFromLocale(supportedCodes);
  if (localeCountry) return localeCountry;

  return "DE";
}

async function resolveSenderCountryCodeFromIp(countries: Country[]): Promise<string | null> {
  const cached = getCachedSenderCountryCode();
  if (cached) return cached;
  if (typeof window === "undefined") return null;

  const supportedCodes = new Set(countries.map((country) => country.code));
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch("/api/geo/country", {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (response.ok) {
        const json = await response.json() as JsonRecord;
        // Handle both raw envelope and pre-unwrapped shapes.
        const inner = (json?.data as JsonRecord | undefined) ?? json;
        const country = String(inner?.country ?? "").toUpperCase();
        if (country && supportedCodes.has(country)) {
          setCachedSenderCountryCode(country);
          return country;
        }
      }
    } finally {
      window.clearTimeout(timeoutId);
    }
  } catch {
    // Fall through to timezone-based detection in resolveDefaultSenderCountryCode.
  }

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

function buildRecipientFullName(parts: {
  firstName?: string;
  middleName?: string;
  surname?: string;
}): string {
  return [parts.firstName, parts.middleName, parts.surname]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function looksLikeBankAccountNumber(rawInput: string): boolean {
  return /^[A-Za-z0-9]{6,20}$/.test(String(rawInput ?? "").trim().replace(/\s+/g, ""));
}

function isImmediateValueTransfer(type: TransferType | ""): type is "airtime_topup" {
  return type === "airtime_topup";
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

function buildReloadlyAirtimePricing(
  operator: JsonRecord | null | undefined,
  options: JsonRecord | null | undefined,
  fallbackSenderCurrency = "",
  fallbackDestinationCurrency = ""
): ReloadlyPricing | null {
  // Use the user's selected sender currency as the source of truth.
  // The Reloadly operator's senderCurrencyCode is their internal billing currency (often EUR),
  // not the user's actual currency — so we prioritise fallbackSenderCurrency (form.currencyFrom).
  const senderCurrencyCode = String(
    fallbackSenderCurrency || options?.senderCurrencyCode || operator?.senderCurrencyCode || ""
  )
    .trim()
    .toUpperCase();
  const destinationCurrencyCode = String(
    options?.destinationCurrencyCode ?? operator?.destinationCurrencyCode ?? fallbackDestinationCurrency ?? ""
  )
    .trim()
    .toUpperCase();
  const rawFxRate = toFinancialNumber(
    options?.fxRate ??
      options?.fx?.rate ??
      options?.fx?.fxRate ??
      operator?.fxRate ??
      operator?.fx?.rate ??
      operator?.fx?.fxRate
  );
  // When sender and destination currencies are the same there is no conversion.
  const fxRate = senderCurrencyCode && destinationCurrencyCode && senderCurrencyCode === destinationCurrencyCode
    ? 1
    : rawFxRate;
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

type ReceiptPdfSection = {
  title: string;
  rows: Array<[string, string]>;
  accent?: boolean;
};

type ReceiptPdfOptions = {
  brandingText: string;
  title: string;
  generatedAt: string;
  transactionKindLabel: string;
  transactionKindValue: string;
  statusLabel: string;
  statusValue: string;
  referenceLabel: string;
  referenceValue: string;
  transactionIdLabel: string;
  transactionIdValue: string;
  sections: ReceiptPdfSection[];
  footerLines: string[];
};

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
  strokeWidth = 1
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
  }
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, value: string, maxWidth: number): string[] {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (!normalized) return ["-"];
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (!current || ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function measureSectionHeight(ctx: CanvasRenderingContext2D, width: number, rows: Array<[string, string]>) {
  const innerWidth = width - 56;
  const labelWidth = Math.min(220, innerWidth * 0.36);
  const valueWidth = innerWidth - labelWidth - 28;
  let height = 78;
  ctx.font = "600 24px Inter, Arial, sans-serif";
  for (const [, value] of rows) {
    const lineCount = wrapCanvasText(ctx, value, valueWidth).length;
    height += Math.max(34, lineCount * 26 + 8);
  }
  return height + 12;
}

function drawSectionCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  section: ReceiptPdfSection
) {
  const height = measureSectionHeight(ctx, width, section.rows);
  drawRoundedRect(
    ctx,
    x,
    y,
    width,
    height,
    28,
    section.accent ? "#FFF8E1" : "#F8FAFC",
    section.accent ? "#E0B74C" : "#D7DEE8",
    section.accent ? 2 : 1
  );

  ctx.fillStyle = "#0F172A";
  ctx.font = "700 28px Inter, Arial, sans-serif";
  ctx.fillText(section.title, x + 28, y + 44);

  const innerWidth = width - 56;
  const labelWidth = Math.min(220, innerWidth * 0.36);
  const valueWidth = innerWidth - labelWidth - 28;
  let cursorY = y + 84;

  for (const [label, value] of section.rows) {
    ctx.fillStyle = "#64748B";
    ctx.font = "700 18px Inter, Arial, sans-serif";
    ctx.fillText(label, x + 28, cursorY);

    ctx.fillStyle = "#111827";
    ctx.font = "600 24px Inter, Arial, sans-serif";
    const lines = wrapCanvasText(ctx, value, valueWidth);
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 28 + labelWidth + 28, cursorY + index * 26);
    });

    const rowHeight = Math.max(34, lines.length * 26 + 8);
    cursorY += rowHeight;
  }

  return y + height + 24;
}

function buildSingleImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let cursor = 0;

  const push = (value: string | Uint8Array) => {
    const bytes = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(bytes);
    cursor += bytes.length;
  };

  const content = `q
595 0 0 842 0 0 cm
/Im0 Do
Q
`;
  const contentBytes = encoder.encode(content);

  push(`%PDF-1.4
`);
  offsets[1] = cursor;
  push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`);
  offsets[2] = cursor;
  push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`);
  offsets[3] = cursor;
  push(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`);
  offsets[4] = cursor;
  push(`4 0 obj
<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>
stream
`);
  push(jpegBytes);
  push(`
endstream
endobj
`);
  offsets[5] = cursor;
  push(`5 0 obj
<< /Length ${contentBytes.length} >>
stream
${content}endstream
endobj
`);

  const xrefStart = cursor;
  push(`xref
0 6
0000000000 65535 f 
`);
  for (let i = 1; i <= 5; i += 1) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n 
`);
  }
  push(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefStart}
%%EOF`);

  const output = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("Unable to generate receipt image."));
        return;
      }
      resolve(nextBlob);
    }, "image/jpeg", 0.94);
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function createReceiptPdfBlob(options: ReceiptPdfOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create receipt canvas.");

  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoundedRect(ctx, 72, 72, canvas.width - 144, 220, 34, "#0F172A");
  ctx.fillStyle = "#F8FAFC";
  ctx.font = "700 24px Inter, Arial, sans-serif";
  ctx.fillText(options.brandingText, 112, 128);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 52px Inter, Arial, sans-serif";
  ctx.fillText(options.title, 112, 196);
  ctx.fillStyle = "#CBD5E1";
  ctx.font = "500 24px Inter, Arial, sans-serif";
  ctx.fillText(options.generatedAt, 112, 238);

  drawRoundedRect(ctx, 72, 326, canvas.width - 144, 170, 28, "#FFFFFF", "#D7DEE8");
  const topRows: Array<[string, string, number]> = [
    [options.transactionKindLabel, options.transactionKindValue, 112],
    [options.statusLabel, options.statusValue, 392],
    [options.referenceLabel, options.referenceValue, 672],
  ];
  topRows.forEach(([label, value, x]) => {
    ctx.fillStyle = "#64748B";
    ctx.font = "700 18px Inter, Arial, sans-serif";
    ctx.fillText(label, x, 382);
    ctx.fillStyle = "#0F172A";
    ctx.font = "700 28px Inter, Arial, sans-serif";
    wrapCanvasText(ctx, value, 220).slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, x, 420 + index * 28);
    });
  });
  ctx.fillStyle = "#64748B";
  ctx.font = "700 18px Inter, Arial, sans-serif";
  ctx.fillText(options.transactionIdLabel, 952, 382);
  ctx.fillStyle = "#0F172A";
  ctx.font = "700 28px Inter, Arial, sans-serif";
  wrapCanvasText(ctx, options.transactionIdValue, 180).slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, 952, 420 + index * 28);
  });

  let y = 536;
  for (const section of options.sections) {
    y = drawSectionCard(ctx, 72, y, canvas.width - 144, section);
  }

  ctx.fillStyle = "#64748B";
  ctx.font = "500 20px Inter, Arial, sans-serif";
  let footerY = canvas.height - 110;
  for (const line of options.footerLines) {
    ctx.fillText(line, 72, footerY);
    footerY += 28;
  }

  const jpegBytes = await canvasToJpegBytes(canvas);
  const pdfBytes = buildSingleImagePdf(jpegBytes, canvas.width, canvas.height);
  return new Blob([pdfBytes], { type: "application/pdf" });
}

export default function SendMoneyForm({
  forcedTransferType = null,
  forcedRecipientType = null,
  showTransferTypeSelector = true,
  onTransactionSubmitted,
}: SendMoneyFormProps) {
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const defaultSenderCodeRef = useRef<string>(resolveDefaultSenderCountryCode(FALLBACK_SENDER_COUNTRIES));
  const [senderCountriesConfig, setSenderCountriesConfig] = useState<Country[]>(FALLBACK_SENDER_COUNTRIES);
  const [supportedBanks, setSupportedBanks] = useState<string[]>(FALLBACK_SUPPORTED_BANKS);
  const [transferLimits, setTransferLimits] = useState<TransferLimits>(FALLBACK_TRANSFER_LIMITS);
  const [form, setForm] = useState<SendMoneyFormState>(() => {
    const initialTransferType =
      forcedTransferType === "send_money" || forcedTransferType === "airtime_topup"
        ? forcedTransferType
        : INITIAL_FORM.transferType;
    const initialRecipientType =
      forcedRecipientType === "mobile_money" ||
      forcedRecipientType === "cash_pickup" ||
      forcedRecipientType === "bank_transfer"
        ? forcedRecipientType
        : INITIAL_FORM.recipientType;
    const defaultSender =
      FALLBACK_SENDER_COUNTRIES.find((country) => country.code === defaultSenderCodeRef.current) ||
      FALLBACK_SENDER_COUNTRIES.find((country) => country.code === INITIAL_FORM.senderCountryCode) ||
      FALLBACK_SENDER_COUNTRIES[0]!;

    return {
      ...INITIAL_FORM,
      transferType: initialTransferType,
      recipientType: initialRecipientType,
      senderCountryCode: defaultSender.code,
      currencyFrom: defaultSender.currency,
    };
  });
  const [step, setStep] = useState<FormStep>("route");
  const [amountMode, setAmountMode] = useState<AmountMode>("send");
  const [loading, setLoading] = useState(false);
  const [bankAccountConfirm, setBankAccountConfirm] = useState("");
  const [receiptDownloading, setReceiptDownloading] = useState(false);
  const [quote, setQuote] = useState<JsonRecord | null>(null);
  const [status, setStatus] = useState<SendMoneyStatus | null>(null);
  const [error, setError] = useState("");
  const [baselineFxRate, setBaselineFxRate] = useState<number | null>(null);
  const [cachedBaselineFxRate, setCachedBaselineFxRate] = useState<number | null>(null);
  const [cachedSendMoneyFee, setCachedSendMoneyFee] = useState<number | null>(null);
  const [cachedReloadlyPricing, setCachedReloadlyPricing] = useState<{
    airtime_topup?: ReloadlyPricing;
  }>({});
  const [airtimeOperator, setAirtimeOperator] = useState<AirtimeOperator>(null);
  const [airtimeLookupLoading, setAirtimeLookupLoading] = useState(false);
  const [airtimeOptions, setAirtimeOptions] = useState<Array<number | string>>([]);
  const [airtimeFeeQuote, setAirtimeFeeQuote] = useState(0);
  const [reloadlyPricing, setReloadlyPricing] = useState<ReloadlyPricing | null>(null);
  const [autoDetectedSenderCountryCode, setAutoDetectedSenderCountryCode] = useState<string | null>(
    getCachedSenderCountryCode()
  );
  const [senderCountryDetectionResolved, setSenderCountryDetectionResolved] = useState(
    Boolean(getCachedSenderCountryCode())
  );
  const liveQuoteRequestRef = useRef<number>(0);
  const airtimeRequestRef = useRef<number>(0);
  const latestAmountRef = useRef({ amount: 0, amountMode: "send" as AmountMode, amountReceive: 0 });
  // Generated once per payment attempt when advancing to the "pay" step.
  // Reset to null when the form resets so each new submission gets a fresh key.
  const paymentIdempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadSenderCountries = async () => {
      try {
        const response = await api.get("/fintech/remittance/config");
        const payload = (response.data?.data ?? response.data) as JsonRecord | undefined;
        const rawCountries = Array.isArray(payload?.senderCountries) ? payload.senderCountries : [];
        const rawBanks = Array.isArray(payload?.supportedBanks) ? payload.supportedBanks : [];
        const nextBanks = rawBanks
          .map((bank) => String(bank ?? "").trim())
          .filter(Boolean);
        const nextTransferLimits = {
          maxPerTransaction: Number(payload?.transferLimits?.maxPerTransaction ?? FALLBACK_TRANSFER_LIMITS.maxPerTransaction),
          dailyLimit: Number(payload?.transferLimits?.dailyLimit ?? FALLBACK_TRANSFER_LIMITS.dailyLimit),
          weeklyLimit: Number(payload?.transferLimits?.weeklyLimit ?? FALLBACK_TRANSFER_LIMITS.weeklyLimit),
          monthlyLimit: Number(payload?.transferLimits?.monthlyLimit ?? FALLBACK_TRANSFER_LIMITS.monthlyLimit),
        };
        const nextCountries = rawCountries
          .map((country) => ({
            code: String((country as JsonRecord)?.code ?? "").trim().toUpperCase(),
            flag: String((country as JsonRecord)?.flag ?? "").trim(),
            name: String((country as JsonRecord)?.name ?? "").trim(),
            currency: String((country as JsonRecord)?.currency ?? "").trim().toUpperCase(),
          }))
          .filter((country) => country.code && country.name && country.currency);

        if (!active) return;

        if (nextBanks.length > 0) {
          setSupportedBanks(nextBanks);
        }
        if (Number.isFinite(nextTransferLimits.maxPerTransaction) && nextTransferLimits.maxPerTransaction > 0) {
          setTransferLimits({
            maxPerTransaction: nextTransferLimits.maxPerTransaction,
            dailyLimit: Number.isFinite(nextTransferLimits.dailyLimit) && nextTransferLimits.dailyLimit > 0 ? nextTransferLimits.dailyLimit : FALLBACK_TRANSFER_LIMITS.dailyLimit,
            weeklyLimit: Number.isFinite(nextTransferLimits.weeklyLimit) && nextTransferLimits.weeklyLimit > 0 ? nextTransferLimits.weeklyLimit : FALLBACK_TRANSFER_LIMITS.weeklyLimit,
            monthlyLimit: Number.isFinite(nextTransferLimits.monthlyLimit) && nextTransferLimits.monthlyLimit > 0 ? nextTransferLimits.monthlyLimit : FALLBACK_TRANSFER_LIMITS.monthlyLimit,
          });
        }
        if (nextCountries.length === 0) return;

        setSenderCountriesConfig(nextCountries);
        const nextDefaultCode = resolveDefaultSenderCountryCode(nextCountries);
        defaultSenderCodeRef.current = nextDefaultCode;

        setForm((prev) => {
          const supported = new Set(nextCountries.map((country) => country.code));
          const fallbackCountry =
            nextCountries.find((country) => country.code === nextDefaultCode) ?? nextCountries[0]!;
          const selectedCountry =
            nextCountries.find((country) => country.code === prev.senderCountryCode) ?? null;

          if (!supported.has(prev.senderCountryCode)) {
            return {
              ...prev,
              senderCountryCode: fallbackCountry.code,
              currencyFrom: fallbackCountry.currency,
            };
          }

          if (selectedCountry && prev.currencyFrom !== selectedCountry.currency) {
            return {
              ...prev,
              currencyFrom: selectedCountry.currency,
            };
          }

          return prev;
        });
      } catch {
        // Keep the local fallback list when runtime config is unavailable.
      }
    };

    void loadSenderCountries();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const detectAndApplyCountry = async () => {
      const detectedCountryCode = await resolveSenderCountryCodeFromIp(senderCountriesConfig);
      if (!active) return;

      if (!detectedCountryCode) {
        setSenderCountryDetectionResolved(true);
        return;
      }

      setCachedSenderCountryCode(detectedCountryCode);
      setAutoDetectedSenderCountryCode(detectedCountryCode);
      setSenderCountryDetectionResolved(true);
      const detectedSender = senderCountriesConfig.find((country) => country.code === detectedCountryCode);
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
  }, [senderCountriesConfig]);

  const senderCountries = useMemo<Country[]>(
    () =>
      senderCountriesConfig.map((country) => ({
        ...country,
        name: getLocalizedRegionName(country.code, i18n.language, country.name),
      })),
    [i18n.language, senderCountriesConfig]
  );

  const receiverCountry = useMemo<ReceiverCountry>(() => {
    const match = RECEIVER_COUNTRIES.find((c) => c.code === form.receiverCountryCode) ?? DEFAULT_RECEIVER_COUNTRY;
    return { ...match, name: getLocalizedRegionName(match.code, i18n.language, match.name) };
  }, [form.receiverCountryCode, i18n.language]);

  const selectedSender = useMemo<Country>(
    () => senderCountries.find((country) => country.code === form.senderCountryCode) || senderCountries[0]!,
    [form.senderCountryCode, senderCountries]
  );
  const maxTransferAmount = transferLimits.maxPerTransaction;

  const amount = parseAmountInput(form.amountSent) ?? 0;
  const amountReceive = parseAmountInput(form.amountReceive) ?? 0;
  const airtimeHasValidPhone = form.transferType === "airtime_topup" && looksLikeZimbabweNumber(form.recipientPhone);
  const airtimeLookupPhone = airtimeHasValidPhone ? normalizeZimbabweNumber(form.recipientPhone) : null;
  const airtimeLookupKey =
    form.transferType === "airtime_topup" && airtimeLookupPhone
      ? `${airtimeLookupPhone}|${form.currencyFrom}|${form.currencyTo}`
      : "";
  const isReloadlyTransfer = isImmediateValueTransfer(form.transferType);
  const liveQuotedFee = useMemo(
    () => (form.transferType === "send_money" ? extractProviderFee(quote, amount) : null),
    [amount, form.transferType, quote]
  );
  const providerCharge = useMemo(() => {
    const quotedFee = liveQuotedFee;
    if (quotedFee !== null && quotedFee >= 0) return Number(quotedFee.toFixed(2));

    if (form.transferType === "airtime_topup") {
      const topupFee = extractProviderFee(status?.providerResponse?.topup, amount);
      if (topupFee !== null && topupFee >= 0) return Number(topupFee.toFixed(2));

      if (reloadlyPricing?.source === "airtime_topup" && reloadlyPricing.fee !== null && reloadlyPricing.fee >= 0) {
        return Number(reloadlyPricing.fee.toFixed(2));
      }

      if (airtimeFeeQuote > 0) return Number(airtimeFeeQuote.toFixed(2));

      return null;
    }

    return null;
  }, [airtimeFeeQuote, amount, form.transferType, liveQuotedFee, reloadlyPricing, status]);
  const fee = useMemo(
    () => (typeof providerCharge === "number" && Number.isFinite(providerCharge) ? Number(providerCharge.toFixed(2)) : null),
    [providerCharge]
  );
  const totalCharge = useMemo(
    () => (typeof fee === "number" && Number.isFinite(fee) ? Number((amount + fee).toFixed(2)) : null),
    [amount, fee]
  );
  const displayFee = useMemo(() => {
    if (fee !== null && fee >= 0) return fee;
    if (form.transferType === "send_money" && cachedSendMoneyFee !== null && cachedSendMoneyFee >= 0) {
      return Number(cachedSendMoneyFee.toFixed(2));
    }
    if (isReloadlyTransfer) {
      const cached = cachedReloadlyPricing.airtime_topup;
      if (cached?.fee !== null && cached?.fee !== undefined && cached.fee >= 0) {
        return Number(cached.fee.toFixed(2));
      }
    }
    return fee;
  }, [cachedReloadlyPricing, cachedSendMoneyFee, fee, form.transferType, isReloadlyTransfer]);
  const displayTotalCharge = useMemo(
    () =>
      typeof displayFee === "number" && Number.isFinite(displayFee) ? Number((amount + displayFee).toFixed(2)) : null,
    [amount, displayFee]
  );
  const effectiveQuote = form.transferType === "send_money" ? quote : null;
  const quotedReceiveAmount = Number(effectiveQuote?.receivingAmount || 0);
  const quoteFxRate = extractFxRate(effectiveQuote, amount) ?? 0;
  const reloadlyFxRate = isReloadlyTransfer ? Number(reloadlyPricing?.fxRate ?? 0) : 0;
  const fxRate = useMemo(() => {
    if (isReloadlyTransfer) {
      if (Number.isFinite(reloadlyFxRate) && reloadlyFxRate > 0) return Number(reloadlyFxRate.toFixed(6));
      return 0;
    }
    if (Number.isFinite(quoteFxRate) && quoteFxRate > 0) return Number(quoteFxRate.toFixed(6));
    if (Number.isFinite(baselineFxRate) && (baselineFxRate ?? 0) > 0) return Number((baselineFxRate ?? 0).toFixed(6));
    return 0;
  }, [baselineFxRate, isReloadlyTransfer, quoteFxRate, reloadlyFxRate]);

  useEffect(() => {
    if (!Number.isFinite(quoteFxRate) || quoteFxRate <= 0) return;
    setBaselineFxRate(Number(quoteFxRate.toFixed(6)));
  }, [quoteFxRate]);
  const displayFxRate = useMemo(() => {
    if (fxRate > 0) return Number(fxRate.toFixed(6));
    if (isReloadlyTransfer) {
      const cached = cachedReloadlyPricing.airtime_topup;
      const candidate = Number(reloadlyPricing?.fxRate ?? cached?.fxRate ?? 0);
      return candidate > 0 ? Number(candidate.toFixed(6)) : 0;
    }
    const candidate = Number(baselineFxRate ?? cachedBaselineFxRate ?? 0);
    return candidate > 0 ? Number(candidate.toFixed(6)) : 0;
  }, [
    baselineFxRate,
    cachedBaselineFxRate,
    cachedReloadlyPricing,
    fxRate,
    form.transferType,
    isReloadlyTransfer,
    reloadlyPricing,
  ]);
  const resolvedReceiveInput = isReloadlyTransfer && !(fxRate > 0) ? 0 : amountReceive;
  const estimatedReceive =
    quotedReceiveAmount > 0
      ? quotedReceiveAmount
      : resolvedReceiveInput > 0
        ? resolvedReceiveInput
        : fxRate > 0 && amount > 0
          ? amount * fxRate
          : 0;
  const displayedReceiveAmount = estimatedReceive > 0 ? Number(estimatedReceive.toFixed(2)) : 0;
  const liveAmountInput = amountMode === "send" ? form.amountSent : form.amountReceive;
  const cachedReloadlyPricingForType = isReloadlyTransfer
    ? cachedReloadlyPricing.airtime_topup
    : undefined;
  const displaySendCurrency = isReloadlyTransfer
    ? reloadlyPricing?.senderCurrencyCode || cachedReloadlyPricingForType?.senderCurrencyCode || form.currencyFrom
    : form.currencyFrom;
  const displayReceiveCurrency = isReloadlyTransfer
    ? reloadlyPricing?.destinationCurrencyCode || cachedReloadlyPricingForType?.destinationCurrencyCode || form.currencyTo
    : form.currencyTo;
  const fxRateDisplayText =
    displayFxRate > 0
      ? `1 ${displaySendCurrency} = ${displayFxRate.toFixed(6)} ${displayReceiveCurrency}`
      : tr("payments.form.quote.fetching", "Fetching rate...");
  const displayFeeText =
    typeof displayFee === "number" && Number.isFinite(displayFee)
      ? formatAmount(displayFee, displaySendCurrency)
      : tr("payments.form.quote.fee_pending", "Fee confirmed before payment");
  const displayTotalChargeText =
    typeof displayTotalCharge === "number" && Number.isFinite(displayTotalCharge)
      ? formatAmount(displayTotalCharge, displaySendCurrency)
      : tr("payments.form.quote.total_pending", "Total confirmed before payment");
  const receiveAmountLabel = tr("payments.form.fields.they_receive", "They receive");
  const showRouteSummary =
    form.transferType === "send_money" ||
    form.transferType === "airtime_topup";
  const reloadlyReceiveInputDisabled = isReloadlyTransfer && !(fxRate > 0);

  const requestQuote = async (sendingAmount: number): Promise<JsonRecord | null> => {
    const response = await api.post("/fintech/remittance/quote", {
      amountSent: Number(sendingAmount),
      currencyFrom: String(form.currencyFrom).toUpperCase(),
      currencyTo: String(form.currencyTo).toUpperCase(),
      receivingCountry: String(form.receiverCountryCode).toUpperCase(),
      originCountry: String(form.senderCountryCode).toUpperCase(),
      senderMsisdn: String(form.senderMsisdn || "").trim() || undefined,
      recipientType: form.recipientType || undefined,
      payoutChannel: form.recipientType === "bank_transfer" ? form.bankName : undefined,
      recipientMsisdn: String(form.mobileNumber || form.recipientPhone || "").trim() || undefined,
      recipientBankName: form.recipientType === "bank_transfer" ? String(form.bankName || "").trim() || undefined : undefined,
      recipientBankAccountNumber:
        form.recipientType === "bank_transfer"
          ? String(form.bankAccountNumber || "").trim() || undefined
          : undefined,
    });
    // Unwrap the API envelope { success, data: { idempotencyKey, quote, ... }, error }
    const envelope = response?.data as JsonRecord | undefined;
    const inner = (envelope?.data as JsonRecord | undefined) ?? envelope;
    const resolvedQuote = (inner?.fxQuote as JsonRecord | undefined) ?? (inner?.quote as JsonRecord | undefined) ?? null;
    if (!resolvedQuote) return (inner as JsonRecord | undefined) ?? null;
    return {
      ...resolvedQuote,
      quoteToken: String(inner?.quoteToken ?? resolvedQuote?.quoteToken ?? "").trim() || undefined,
    };
  };

  useEffect(() => {
    let active = true;

    if (form.transferType === "airtime_topup") {
      return () => {
        active = false;
      };
    }

    if (quoteFxRate > 0) {
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const previewQuote = await requestQuote(FX_RATE_PREVIEW_AMOUNT);
        if (!active || !previewQuote) return;

        const previewFxRate = extractFxRate(previewQuote, FX_RATE_PREVIEW_AMOUNT);
        if (previewFxRate && previewFxRate > 0) {
          setBaselineFxRate(Number(previewFxRate.toFixed(6)));
        }
        const previewFee = extractProviderFee(previewQuote, FX_RATE_PREVIEW_AMOUNT);
        if (previewFee !== null && previewFee >= 0) {
          setCachedSendMoneyFee(Number(previewFee.toFixed(2)));
        }
      } catch {
        // Keep cached preview values if the background request fails.
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
    quoteFxRate,
  ]);

  useEffect(() => {
    if (!baselineFxRate || baselineFxRate <= 0) return;
    setCachedBaselineFxRate(baselineFxRate);
  }, [baselineFxRate]);

  useEffect(() => {
    setQuote(null);
    setBaselineFxRate(null);
    setCachedBaselineFxRate(null);
    setCachedSendMoneyFee(null);
  }, [form.senderCountryCode, form.receiverCountryCode, form.currencyFrom, form.currencyTo]);

  useEffect(() => {
    if (form.transferType !== "airtime_topup") return;
    setCachedReloadlyPricing({});
  }, [airtimeLookupKey, form.transferType]);

  useEffect(() => {
    if (form.currencyFrom !== selectedSender.currency) {
      setForm((prev) => ({ ...prev, currencyFrom: selectedSender.currency }));
    }
  }, [form.currencyFrom, selectedSender.currency]);

  // Keep currencyTo in sync with the selected receiver country.
  useEffect(() => {
    const expectedCurrency = (RECEIVER_COUNTRIES.find((c) => c.code === form.receiverCountryCode) ?? DEFAULT_RECEIVER_COUNTRY).currency;
    if (form.currencyTo !== expectedCurrency) {
      setForm((prev) => ({ ...prev, currencyTo: expectedCurrency }));
    }
  }, [form.receiverCountryCode, form.currencyTo]);

  useEffect(() => {
    if (forcedTransferType !== "send_money" && forcedTransferType !== "airtime_topup") return;
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
    if (
      forcedRecipientType !== "mobile_money" &&
      forcedRecipientType !== "cash_pickup" &&
      forcedRecipientType !== "bank_transfer"
    ) {
      return;
    }
    setForm((prev) => {
      if (prev.recipientType === forcedRecipientType) return prev;
      return {
        ...prev,
        recipientType: forcedRecipientType,
      };
    });
  }, [forcedRecipientType]);

  useEffect(() => {
    if (form.transferType === "send_money") {
      if (reloadlyPricing !== null) setReloadlyPricing(null);
      return;
    }
    if (quote !== null) setQuote(null);
  }, [form.transferType, quote, reloadlyPricing]);

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
    if (!Number.isFinite(sendingAmount) || sendingAmount <= 0 || sendingAmount > maxTransferAmount) return;

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
          if (!Number.isFinite(derivedSendAmount) || derivedSendAmount <= 0 || derivedSendAmount > maxTransferAmount) return;

          const finalQuote = await requestQuote(derivedSendAmount);
          if (!finalQuote || liveQuoteRequestRef.current !== requestId) return;
          setQuote(finalQuote);

          const finalRate = extractFxRate(finalQuote, derivedSendAmount) ?? 0;
          if (!Number.isFinite(finalRate) || finalRate <= 0) return;

          setForm((prev) => {
            if (
              prev.transferType !== "send_money" &&
              prev.transferType !== "airtime_topup"
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
            prev.transferType !== "airtime_topup"
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
    form.senderCountryCode,
    form.senderMsisdn,
    form.recipientType,
    form.mobileNumber,
    form.recipientPhone,
    form.transferType,
    liveAmountInput,
    maxTransferAmount,
    step,
  ]);

  useEffect(() => {
    if (form.transferType !== "send_money" || (step !== "recipient" && step !== "payout")) {
      return;
    }

    const sendInput = parseAmountInput(form.amountSent) ?? 0;
    const receiveInput = parseAmountInput(form.amountReceive) ?? 0;
    const rawInput = parseAmountInput(liveAmountInput) ?? 0;
    if (rawInput <= 0) {
      return;
    }

    if (amountMode === "receive" && !isMultipleOfTen(receiveInput)) return;

    const sendingAmount = amountMode === "send" ? sendInput : receiveInput;
    if (!Number.isFinite(sendingAmount) || sendingAmount <= 0 || sendingAmount > maxTransferAmount) return;

    const recipientMsisdn = String(form.mobileNumber || form.recipientPhone || "").trim();
    if ((form.recipientType === "mobile_money" || form.recipientType === "cash_pickup") && !recipientMsisdn) {
      return;
    }

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
          if (!Number.isFinite(derivedSendAmount) || derivedSendAmount <= 0 || derivedSendAmount > maxTransferAmount) return;

          const finalQuote = await requestQuote(derivedSendAmount);
          if (!finalQuote || liveQuoteRequestRef.current !== requestId) return;
          setQuote(finalQuote);

          const finalRate = extractFxRate(finalQuote, derivedSendAmount) ?? 0;
          if (!Number.isFinite(finalRate) || finalRate <= 0) return;

          setForm((prev) => {
            if (prev.transferType !== "send_money") {
              return prev;
            }
            const normalizedReceive = normalizeToTenStep(receiveInput);
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
          if (prev.transferType !== "send_money") {
            return prev;
          }
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
    form.amountReceive,
    form.amountSent,
    form.cardNumber,
    form.currencyFrom,
    form.currencyTo,
    form.mobileNumber,
    form.recipientPhone,
    form.recipientType,
    form.receiverCountryCode,
    form.senderCountryCode,
    form.senderMsisdn,
    form.transferType,
    liveAmountInput,
    maxTransferAmount,
    step,
  ]);

  useEffect(() => {
    latestAmountRef.current = { amount, amountMode, amountReceive };
  }, [amount, amountMode, amountReceive]);

  useEffect(() => {
    if (!reloadlyPricing || !Number.isFinite(reloadlyPricing.fxRate) || reloadlyPricing.fxRate <= 0) return;
    setCachedReloadlyPricing((prev) => ({ ...prev, [reloadlyPricing.source]: reloadlyPricing }));
  }, [reloadlyPricing]);

  useEffect(() => {
    if (form.transferType !== "airtime_topup") {
      setAirtimeOperator(null);
      setAirtimeLookupLoading(false);
      setAirtimeOptions([]);
      setAirtimeFeeQuote(0);
      if (reloadlyPricing?.source === "airtime_topup") setReloadlyPricing(null);
      return;
    }

    if (!airtimeLookupPhone) {
      setAirtimeOperator(null);
      setAirtimeLookupLoading(false);
      setAirtimeOptions([]);
      setAirtimeFeeQuote(0);
      if (reloadlyPricing?.source === "airtime_topup") setReloadlyPricing(null);
      return;
    }

    const requestId = airtimeRequestRef.current + 1;
    airtimeRequestRef.current = requestId;
    if (airtimeHasValidPhone) setAirtimeLookupLoading(true);

    const timer = setTimeout(async () => {
      try {
        const previewAmount =
          latestAmountRef.current.amount > 0 ? latestAmountRef.current.amount : FX_RATE_PREVIEW_AMOUNT;
        const optionsResponse = await api.post("/fintech/airtime/options", {
          phoneNumber: airtimeLookupPhone,
          amount: previewAmount,
        });
        if (airtimeRequestRef.current !== requestId) return;
        const optionsPayload = optionsResponse?.data as { options?: JsonRecord; operator?: AirtimeOperator } | undefined;
        const operator = optionsPayload?.operator ?? null;
        setAirtimeOperator(airtimeHasValidPhone ? operator : null);
        setAirtimeLookupLoading(false);
        const options = optionsPayload?.options ?? {};
        const suggested = options?.suggestedAmounts || [];
        setAirtimeOptions(airtimeHasValidPhone && Array.isArray(suggested) ? suggested : []);
        const parsedFee = extractProviderFee(options);
        setAirtimeFeeQuote(parsedFee !== null && parsedFee >= 0 ? Number(parsedFee.toFixed(2)) : 0);
        const pricing = buildReloadlyAirtimePricing(operator, options, form.currencyFrom, form.currencyTo);
        setReloadlyPricing(pricing);
        const latestAmount = latestAmountRef.current;
        if (pricing?.fxRate && latestAmount.amount > 0) {
          setForm((prev) => {
            if (prev.transferType !== "airtime_topup") return prev;
            if (latestAmount.amountMode === "send") {
              const nextReceive = toAmountInputString(latestAmount.amount * pricing.fxRate);
              return nextReceive !== prev.amountReceive ? { ...prev, amountReceive: nextReceive } : prev;
            }
            if (latestAmount.amountMode === "receive" && latestAmount.amountReceive > 0) {
              const nextSend = toAmountInputString(latestAmount.amountReceive / pricing.fxRate);
              return nextSend !== prev.amountSent ? { ...prev, amountSent: nextSend } : prev;
            }
            return prev;
          });
        }
      } catch {
        setAirtimeOperator(null);
        setAirtimeLookupLoading(false);
        setAirtimeOptions([]);
        setAirtimeFeeQuote(0);
        if (reloadlyPricing?.source === "airtime_topup") setReloadlyPricing(null);
      }
    }, airtimeHasValidPhone ? 450 : 0);

    return () => clearTimeout(timer);
  }, [airtimeHasValidPhone, airtimeLookupKey, airtimeLookupPhone, form.currencyFrom, form.currencyTo, form.transferType]);

  const update = (key: keyof SendMoneyFormState, value: string) => {
    const invalidatesLiveQuote =
      key === "recipientType" ||
      key === "senderMsisdn" ||
      key === "recipientPhone" ||
      key === "mobileNumber" ||
      key === "cashPickupLocation" ||
      key === "bankName" ||
      key === "bankAccountNumber";

    if (form.transferType === "send_money" && invalidatesLiveQuote) {
      setQuote((prev) => (prev ? null : prev));
    }

    setForm((prev) => ({ ...prev, [key]: value } as SendMoneyFormState));
  };

  const updateAmountSent = (value: string) => {
    setAmountMode("send");
    if (form.transferType === "send_money") {
      setQuote((prev) => (prev ? null : prev));
    }
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
    if (form.transferType === "send_money") {
      setQuote((prev) => (prev ? null : prev));
    }
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

        if (!(fxRate > 0)) {
          next.amountSent = "";
          return next;
        }

        next.amountSent = toAmountInputString(normalizedValue / fxRate);
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
    const validAmount = (() => {
      if (amountMode === "receive") {
        if (!Number.isFinite(amountReceive) || amountReceive <= 0) return false;
        if (form.transferType === "send_money") return isMultipleOfTen(amountReceive);
        if (isImmediateValueTransfer(form.transferType)) return fxRate > 0;
        return true;
      }
      return Number.isFinite(amount) && amount > 0 && amount <= maxTransferAmount;
    })();
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone);
    }
    return validAmount;
  }, [amount, amountMode, amountReceive, form.recipientPhone, form.transferType, fxRate, maxTransferAmount]);

  const showGetStartedButton = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return looksLikeZimbabweNumber(form.recipientPhone);
    }
    const hasTransferSelection = form.transferType === "send_money";
    if (!hasTransferSelection) return false;
    const activeAmount = amountMode === "receive" ? amountReceive : amount;
    return Number.isFinite(activeAmount) && activeAmount > 0;
  }, [amount, amountMode, amountReceive, form.recipientPhone, form.transferType]);

  const canContinueRecipient = useMemo(() => {
    // Airtime uses phone in route step — recipient step not shown for airtime
    if (form.transferType === "airtime_topup") return false;

    const recipientFullName = buildRecipientFullName({
      firstName: form.recipientFirstName,
      middleName: form.recipientMiddleName,
      surname: form.recipientSurname,
    });
    const baseValid =
      String(form.recipientFirstName).trim().length >= 2 &&
      String(form.recipientSurname).trim().length >= 2 &&
      recipientFullName.length >= 2 &&
      String(form.recipientAddress).trim().length >= 4 &&
      looksLikeZimbabweNumber(
        form.recipientType === "mobile_money" ? form.mobileNumber : form.recipientPhone
      );

    if (!baseValid) return false;

    // Method-specific delivery fields (merged from old payout step)
    if (form.recipientType === "bank_transfer") {
      return Boolean(String(form.bankName).trim() && looksLikeBankAccountNumber(form.bankAccountNumber))
        && form.bankAccountNumber === bankAccountConfirm;
    }
    if (form.recipientType === "mobile_money") {
      return looksLikeZimbabweNumber(form.mobileNumber);
    }
    if (form.recipientType === "cash_pickup") {
      return looksLikeZimbabweNumber(form.mobileNumber || form.recipientPhone) && String(form.cashPickupLocation).trim().length > 0;
    }
    return true;
  }, [bankAccountConfirm, form]);

  const recipientFullName = useMemo(
    () =>
      buildRecipientFullName({
        firstName: form.recipientFirstName,
        middleName: form.recipientMiddleName,
        surname: form.recipientSurname,
      }),
    [form.recipientFirstName, form.recipientMiddleName, form.recipientSurname]
  );

  // Payout step is now airtime-only; phone already validated in route step
  const canContinuePayout = useMemo(() => {
    return form.transferType === "airtime_topup" && amount > 0 && fxRate > 0;
  }, [amount, fxRate, form.transferType]);

  const buildRemittancePayload = () => ({
    recipientName: recipientFullName,
    recipientType: form.recipientType,
    idempotencyKey: paymentIdempotencyKeyRef.current ?? undefined,
    payoutChannel: form.recipientType === "bank_transfer" ? form.bankName : undefined,
    amountSent: parseAmountInput(form.amountSent) ?? 0,
    currencyFrom: String(form.currencyFrom).toUpperCase(),
    currencyTo: String(form.currencyTo).toUpperCase(),
    receivingCountry: String(form.receiverCountryCode).toUpperCase(),
    originCountry: String(form.senderCountryCode).toUpperCase(),
    senderMsisdn: String(form.senderMsisdn || "").trim() || undefined,
    recipient: {
      mobileNumber: normalizeZimbabweNumber(form.mobileNumber || form.recipientPhone),
      cashPickupLocation: form.cashPickupLocation,
      bankName: form.bankName || undefined,
      bankAccountNumber: form.bankAccountNumber || undefined,
    },
    quoteId: String(quote?.quoteId ?? "").trim() || undefined,
    quoteExpiryTime: String(quote?.quoteExpiryTime ?? "").trim() || undefined,
    quoteToken: String(quote?.quoteToken ?? "").trim() || undefined,
    quotedFxRate: typeof quote?.fxRate === "number" ? quote.fxRate : undefined,
    quotedReceivingAmount: typeof quote?.receivingAmount === "number" ? quote.receivingAmount : undefined,
    quotedReceivingCurrency: String(quote?.receivingCurrency ?? "").trim().toUpperCase() || undefined,
    quotedSenderFee: typeof quote?.senderFee === "number" ? quote.senderFee : undefined,
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
        form.transferType !== "airtime_topup"
      ) {
        throw new Error(
          tr(
            "payments.form.transfer.required_hint",
            "Select Send Money or Airtime Top-up to continue."
          )
        );
      }

      const sendInput = parseAmountInput(form.amountSent) ?? 0;
      const receiveInput = parseAmountInput(form.amountReceive) ?? 0;

      if (isImmediateValueTransfer(form.transferType)) {
        if (!looksLikeZimbabweNumber(form.recipientPhone)) {
          throw new Error(tr("payments.form.errors.invalid_phone", "Enter a valid Zimbabwe phone number."));
        }
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) return;
        setStep("payout");
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
        if (normalizedSendAmount > maxTransferAmount) {
          throw new Error(
            tr("payments.form.errors.amount_limit", `Amount exceeds permitted limit of ${maxTransferAmount}.`).replace(
              "5000",
              String(maxTransferAmount)
            )
          );
        }
        quoteResult = await requestQuote(normalizedSendAmount);
      } else {
        if (!Number.isFinite(normalizedSendAmount) || normalizedSendAmount <= 0) {
          throw new Error(tr("payments.form.errors.invalid_amount", "Enter a valid amount."));
        }
        normalizedSendAmount = Number(normalizedSendAmount.toFixed(2));
        if (normalizedSendAmount > maxTransferAmount) {
          throw new Error(
            tr("payments.form.errors.amount_limit", `Amount exceeds permitted limit of ${maxTransferAmount}.`).replace(
              "5000",
              String(maxTransferAmount)
            )
          );
        }
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
      // Go to method selection unless a delivery type is pre-selected by the parent
      setStep(forcedRecipientType ? "recipient" : "method");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_fetch_quote", "Unable to fetch FX quote.")));
    } finally {
      setLoading(false);
    }
  };

  const onContinueMethod = () => {
    setError("");
    setStep("recipient");
  };

  const onContinueRecipient = async () => {
    setLoading(true);
    setError("");
    try {
      const normalizedPhone = normalizeZimbabweNumber(
        form.recipientType === "mobile_money" ? form.mobileNumber : form.recipientPhone
      );
      const normalizedMobileNumber =
        form.recipientType === "mobile_money" || form.recipientType === "cash_pickup"
          ? normalizeZimbabweNumber(form.mobileNumber)
          : form.mobileNumber;
      setForm((prev) => ({
        ...prev,
        recipientPhone: normalizedPhone,
        mobileNumber: normalizedMobileNumber,
        cashPickupLocation: prev.cashPickupLocation,
      }));
      paymentIdempotencyKeyRef.current = crypto.randomUUID();
      setStep("pay");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.invalid_phone", "Enter a valid Zimbabwe phone number.")));
    } finally {
      setLoading(false);
    }
  };

  const onContinuePayout = async () => {
    // Payout step is now airtime-only
    setLoading(true);
    setError("");
    try {
      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;
      paymentIdempotencyKeyRef.current = crypto.randomUUID();
      setStep("pay");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_verify_session", "Unable to verify your session.")));
    } finally {
      setLoading(false);
    }
  };

  const onPay = async () => {
    if (loading) return; // Guard against double-submission before React re-renders the disabled state
    setLoading(true);
    setError("");
    try {
      // Check quote expiry client-side before hitting the server, so the user
      // gets a clear refresh prompt rather than a cryptic provider rejection.
      if (form.transferType === "send_money") {
        const expiryRaw = String(quote?.quoteExpiryTime ?? "").trim();
        if (expiryRaw) {
          const expiryTs = Date.parse(expiryRaw.replace(" ", "T").replace(/Z?$/, "Z"));
          if (Number.isFinite(expiryTs) && Date.now() > expiryTs) {
            setError(tr("payments.form.errors.quote_expired_refresh", "Your exchange quote has expired. Go back and refresh the quote before paying."));
            setLoading(false);
            return;
          }
        }
      }

      const isAuthenticated = await ensureAuthenticated();
      if (!isAuthenticated) return;
      // Ensure idempotency key is present — should already be set by onContinuePayout,
      // but generate defensively if missing (e.g. direct navigation or state corruption).
      if (!paymentIdempotencyKeyRef.current) {
        paymentIdempotencyKeyRef.current = crypto.randomUUID();
      }

      let nextStatus: SendMoneyStatus | null = null;

      if (form.transferType === "airtime_topup") {
        const response = await api.post("/fintech/airtime/topup", {
          phoneNumber: normalizeZimbabweNumber(form.recipientPhone),
          amount: parseAmountInput(form.amountSent) ?? 0,
          currency: displaySendCurrency,
          idempotencyKey: paymentIdempotencyKeyRef.current,
        });
        nextStatus = {
          kind: "airtime",
          transaction: (response.data as JsonRecord | undefined)?.transaction ?? null,
          providerResponse: (response.data as JsonRecord | undefined)?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        };
      } else {
        const response = await api.post("/fintech/remittance/send", buildRemittancePayload());
        nextStatus = {
          kind: "remittance",
          transaction: (response.data as JsonRecord | undefined)?.transaction ?? null,
          providerResponse: (response.data as JsonRecord | undefined)?.providerResponse ?? null,
          submittedAt: new Date().toISOString(),
        };
      }

      if (nextStatus) {
        setStatus(nextStatus);
        onTransactionSubmitted?.();
      }
      setStep("status");
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_complete_payment", "Unable to complete payment.")));
    } finally {
      setLoading(false);
    }
  };

  const downloadReceiptForStatus = async (receiptStatus: SendMoneyStatus) => {
    try {
      const submittedAt = new Date(receiptStatus.submittedAt || Date.now());
      const payoutLabel =
        form.transferType === "airtime_topup"
          ? tr("payments.form.transfer_types.airtime_topup.label", "Airtime Top-up")
          : tr(
              PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelKey || "payments.form.payout_types.mobile_money",
              PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelFallback || form.recipientType
            ) || form.recipientType;
      const transaction = receiptStatus.transaction || {};
      const ref =
        transaction.provider_reference ||
        transaction.reloadly_reference ||
        receiptStatus.providerResponse?.transfer?.reference ||
        tr("payments.form.status.pending_title", "Pending");
      const transactionKindValue =
        receiptStatus.kind === "airtime"
          ? tr("payments.form.transfer_types.airtime_topup.label", "Airtime Top-up")
          : tr("payments.form.transfer_types.send_money.label", "Send Money");
      const routeValue = `${selectedSender.name} ${tr("payments.form.quote.to", "to")} ${receiverCountry.name}`;
      const recipientValue = recipientFullName || tr("payments.form.pay.recipient", "Recipient");
      const destinationValue =
        form.recipientType === "mobile_money"
          ? normalizeZimbabweNumber(form.mobileNumber || form.recipientPhone) || "-"
          : normalizeZimbabweNumber(form.recipientPhone) || "-";
      const destinationLabel =
        form.transferType === "send_money" && form.recipientType === "mobile_money"
          ? tr("payments.form.payout.ecocash_number", "EcoCash Wallet Number")
          : tr("payments.form.receipt.phone", "Phone");
      const addressValue =
        form.transferType === "send_money"
          ? `${form.recipientAddress}${form.recipientCity ? `, ${form.recipientCity}` : ""}`.trim() || "-"
          : payoutLabel;
      const receiveLabel = tr("payments.form.fields.they_receive", "They receive");
      const sections: ReceiptPdfSection[] = [
        {
          title: tr("payments.form.receipt.transaction_details", "Transaction Details"),
          rows: [
            [tr("payments.form.quote.route", "Route"), routeValue],
            [tr("payments.form.pay.method", "Method"), payoutLabel],
            [tr("payments.form.receipt.date", "Date"), submittedAt.toLocaleString(i18n.language || undefined)],
          ],
        },
        {
          title: tr("payments.form.receipt.recipient_section", "Recipient Details"),
          rows: [
            [tr("payments.form.receipt.recipient", "Recipient"), recipientValue],
            [destinationLabel, destinationValue],
            [
              form.transferType === "send_money"
                ? tr("payments.form.receipt.address", "Address")
                : tr("payments.form.receipt.payout_method", "Payout Method"),
              addressValue,
            ],
          ],
        },
        {
          title: tr("payments.form.pay.summary", "Payment Summary"),
          accent: true,
          rows: [
            [tr("payments.form.fields.you_send", "You send"), formatAmount(amount, displaySendCurrency)],
            [tr("payments.form.fee", "Fee"), displayFeeText],
            [tr("payments.form.total", "Total"), displayTotalChargeText],
            [tr("payments.form.quote.fx_rate", "FX Rate"), fxRateDisplayText],
            [receiveLabel, formatAmount(displayedReceiveAmount, displayReceiveCurrency)],
            [tr("payments.form.pay.settlement_timing", "Settlement timing"), payoutEta],
          ],
        },
      ];
      const pdfBlob = await createReceiptPdfBlob({
        brandingText: "Diaspora Unlocked",
        title: tr("payments.form.receipt.title", "Payment Receipt"),
        generatedAt: `${tr("payments.form.receipt.date", "Date")}: ${submittedAt.toLocaleString(i18n.language || undefined)}`,
        transactionKindLabel: tr("payments.form.receipt.type", "Transaction Type"),
        transactionKindValue,
        statusLabel: tr("payments.form.status.status", "Status"),
        statusValue: String(transaction.status || tr("payments.form.status.pending", "pending")),
        referenceLabel: tr("payments.form.status.reference", "Reference"),
        referenceValue: String(ref),
        transactionIdLabel: tr("payments.form.receipt.transaction_id", "Transaction ID"),
        transactionIdValue: String(transaction.id || tr("payments.form.status.pending_title", "Pending")),
        sections,
        footerLines: [
          tr("payments.receipt.disclaimer_line_1", "Payments are powered by licensed financial infrastructure providers."),
          tr("payments.receipt.disclaimer_line_2", "Diaspora Unlocked does not hold customer funds."),
        ],
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      const fileId = String(transaction.id || ref || Date.now()).replace(/[^a-zA-Z0-9_-]+/g, "-");
      link.href = url;
      link.download = `payment-receipt-${fileId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      setError(extractErrorMessage(err, tr("payments.form.errors.unable_download_receipt", "Unable to download receipt.")));
    }
  };

  const downloadReceipt = async () => {
    if (!status || receiptDownloading) return;
    setReceiptDownloading(true);
    try {
      await downloadReceiptForStatus(status);
    } finally {
      setReceiptDownloading(false);
    }
  };

  const onNewTransfer = () => {
    const resetTransferType =
      forcedTransferType === "send_money" || forcedTransferType === "airtime_topup" ? forcedTransferType : "";
    setError("");
    setQuote(null);
    setStatus(null);
    setAirtimeOperator(null);
    setAirtimeOptions([]);
    setAirtimeFeeQuote(0);
    setReloadlyPricing(null);
    setAmountMode("send");
    setBankAccountConfirm("");
    paymentIdempotencyKeyRef.current = null;
    setForm((prev) => ({
      ...INITIAL_FORM,
      transferType: resetTransferType,
      senderCountryCode: prev.senderCountryCode,
      currencyFrom: prev.currencyFrom,
    }));
    setStep("route");
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/70 focus:border-zim-gold/60";
  const actionRowClass = "flex flex-col gap-3 sm:flex-row sm:justify-end";
  const pillActionBaseClass =
    "inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 py-3 text-center text-[11px] font-black uppercase tracking-widest leading-tight transition sm:w-[11rem]";
  const pillSecondaryClass =
    `${pillActionBaseClass} border border-white/20 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]`;
  const pillPrimaryClass =
    `${pillActionBaseClass} bg-zim-gold text-zim-black hover:bg-white disabled:opacity-60`;
  const continueButtonClass =
    `${pillPrimaryClass} gap-2 disabled:cursor-not-allowed hover:!bg-zim-gold disabled:!bg-zim-gold disabled:!text-zim-black disabled:opacity-100`;
  const pillSuccessClass =
    `${pillActionBaseClass} border border-emerald-300/40 bg-transparent text-emerald-100 hover:bg-emerald-300/15`;
  const optionPillClass =
    "inline-flex min-h-9 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors";
  const summaryCardClass =
    "min-w-[10.5rem] flex-1 snap-start rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:min-w-0";
  const summaryLabelClass = "text-[8px] font-black uppercase tracking-[0.14em] text-zim-gold";
  const summaryMetricClass = "mt-1.5 text-[13px] font-semibold leading-relaxed text-white/88 tabular-nums";
  const summaryValueClass = "mt-1.5 text-[11px] font-light leading-relaxed text-white/72";
  const hideQuoteAmountSummaryCards =
    form.transferType === "send_money" &&
    form.recipientType === "mobile_money";
  const showMobileProvidersSummaryCard =
    form.transferType === "send_money" &&
    form.recipientType === "mobile_money";
  const mobileProvidersSummaryText = tr(
    "payments.form.mobile_money.providers_supported_value",
    "EcoCash"
  );
  const normalizedRecipientPhone = normalizeZimbabweNumber(form.recipientPhone) || "-";
  const normalizedDestinationPhone = normalizeZimbabweNumber(form.mobileNumber || form.recipientPhone) || "-";

  const getLocalizedReflectWindow = (payoutType: PayoutEtaTarget) => {
    if (payoutType === "airtime_topup") {
      return tr("payments.form.eta.airtime", "Usually within minutes.");
    }
    if (payoutType === "mobile_money") {
      return tr("payments.form.eta.mobile_money", "Usually within minutes to 2 hours.");
    }
    if (payoutType === "cash_pickup") {
      return tr("payments.form.eta.cash_pickup", "Usually within 1 hour after provider confirmation.");
    }
    if (payoutType === "bank_transfer") {
      return tr("payments.form.eta.bank_transfer", "Usually 1–3 business days.");
    }
    return tr("payments.form.eta.default", "Timings depend on provider processing windows.");
  };

  const activeFlowSteps =
    form.transferType === "airtime_topup"
      ? AIRTIME_STEPS
      : forcedRecipientType
        ? SEND_MONEY_STEPS_FORCED
        : SEND_MONEY_STEPS;
  const currentStepIndex = activeFlowSteps.findIndex((item) => item.id === step);
  const payoutEta = getLocalizedReflectWindow(
    form.transferType === "airtime_topup" ? "airtime_topup" : form.recipientType
  );
  const selectedPayoutLabel =
    form.transferType === "airtime_topup"
      ? tr("payments.form.transfer_types.airtime_topup.label", "Airtime Top-up")
      : tr(
          PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelKey || "payments.form.payout_types.mobile_money",
          PAYOUT_TYPES.find((item) => item.value === form.recipientType)?.labelFallback || form.recipientType
        );
  const reviewHeading =
    form.transferType === "airtime_topup"
      ? tr("payments.form.pay.review_topup", "Review Top-up")
      : tr("payments.form.pay.review_transfer", "Review Transfer");
  const reviewPrimaryActionLabel =
    form.transferType === "airtime_topup"
      ? tr("payments.form.actions.confirm_topup", "Confirm Top-up")
      : tr("payments.form.actions.confirm_transfer", "Confirm Transfer");
  const reviewSubmittingLabel = tr("payments.form.actions.submitting", "Submitting...");
  const statusHeading =
    form.transferType === "airtime_topup"
      ? tr("payments.form.status.topup_submitted", "Top-up Submitted")
      : tr("payments.form.status.transfer_submitted", "Transfer Submitted");
  const footerNotice = (
    <div className="min-w-0 lg:flex-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-white/60">
        {displayFee === 0 && (
          <>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-light leading-relaxed text-emerald-400/90">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {tr("payments.form.trust.no_hidden_fees", "No hidden fees")}
            </span>
            <span className="hidden h-3.5 w-px bg-white/10 sm:block" aria-hidden="true" />
          </>
        )}
        <p className="min-w-0 flex-1 text-[11px] font-light leading-relaxed">
          {tr(
            "payments.form.system_notice",
            "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds."
          )}
        </p>
      </div>
    </div>
  );
  const renderActionFooter = (actions: React.ReactNode) => (
    <div className="border-t border-white/10 pt-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {footerNotice}
        <div className={actionRowClass}>{actions}</div>
      </div>
    </div>
  );
  const reviewRows: Array<{ label: string; value: string; accent?: boolean }> = [
    {
      label: tr("payments.form.quote.route", "Route"),
      value: `${selectedSender.name} ${tr("payments.form.quote.to", "to")} ${receiverCountry.name}`,
    },
    { label: tr("payments.form.pay.method", "Method"), value: selectedPayoutLabel },
  ];

  if (form.transferType === "airtime_topup") {
    reviewRows.push(
      { label: tr("payments.form.airtime.topup_phone", "Top-up number"), value: normalizedRecipientPhone },
      {
        label: tr("payments.form.airtime.operator", "Operator"),
        value: airtimeOperator
          ? String(airtimeOperator.name ?? tr("payments.form.airtime.operator", "Operator"))
          : tr("payments.form.airtime.detecting", "Auto-detecting..."),
      }
    );
  } else {
    reviewRows.push({ label: tr("payments.form.pay.recipient", "Recipient"), value: recipientFullName || "-" });

    if (form.recipientType !== "mobile_money") {
      reviewRows.push({ label: tr("payments.form.pay.phone", "Phone"), value: normalizedRecipientPhone });
    }

    if (form.recipientType === "mobile_money") {
      reviewRows.push({
        label: tr("payments.form.payout.ecocash_number", "EcoCash Wallet Number"),
        value: normalizedDestinationPhone,
      });
    }

    if (form.recipientType === "cash_pickup") {
      reviewRows.push(
        {
          label: tr("payments.form.payout.recipient_mobile", "Recipient Mobile Number"),
          value: normalizedDestinationPhone,
        },
        {
          label: tr("payments.form.payout.cash_pickup_location", "Preferred pickup city or area"),
          value: String(form.cashPickupLocation || "").trim() || "-",
        }
      );
    }

    if (form.recipientType === "bank_transfer") {
      reviewRows.push(
        {
          label: tr("payments.form.payout.bank_name", "Bank"),
          value: String(form.bankName || "").trim() || "-",
        },
        {
          label: tr("payments.form.payout.bank_account_number", "Account Number"),
          value: String(form.bankAccountNumber || "").trim() || "-",
        }
      );
    }
  }

  reviewRows.push(
    { label: tr("payments.form.fields.you_send", "You send"), value: formatAmount(amount, displaySendCurrency) },
    { label: tr("payments.form.fee", "Fee"), value: displayFeeText },
    { label: tr("payments.form.total", "Total"), value: displayTotalChargeText, accent: true },
    {
      label: tr("payments.form.fields.they_receive", "They receive"),
      value: formatAmount(displayedReceiveAmount, displayReceiveCurrency),
      accent: true,
    }
  );
  const deliveryGuidance =
    form.transferType === "airtime_topup"
      ? tr(
          "payments.form.review.airtime_guidance",
          "The airtime top-up will be sent to the Zimbabwe number above once operator confirmation is complete."
        )
      : form.recipientType === "mobile_money"
        ? tr(
            "payments.form.review.mobile_money_guidance",
            "The wallet number above is the delivery destination for this transfer. Confirm it carefully before submitting."
          )
        : form.recipientType === "cash_pickup"
          ? tr(
              "payments.form.review.cash_pickup_guidance",
              "The recipient must collect with valid government-issued ID that matches the recipient name shown above."
            )
          : tr(
              "payments.form.review.bank_transfer_guidance",
              "The bank account above is the final payout destination. Transfers to the wrong account are difficult to reverse."
            );
  const activeFlowMeta = useMemo(() => {
    if (form.transferType === "airtime_topup") {
      return {
        icon: Smartphone,
        title: tr("payments.form.transfer_types.airtime_topup.label", "Airtime Top-up"),
        subtitle: tr(
          "payments.form.airtime.subtitle",
          "Top up a Zimbabwe mobile line with operator detection, clear amount choices, and fast delivery."
        ),
        trustPoints: [
          {
            icon: ShieldCheck,
            className: "text-emerald-400",
            label: tr("payments.form.trust.encrypted", "Bank-level encryption"),
          },
          {
            icon: CheckCircle2,
            className: "text-zim-gold",
            label: tr("payments.form.trust.operator_detection", "Operator detection before checkout"),
          },
          {
            icon: Clock3,
            className: "text-zim-gold",
            label: tr("payments.form.trust.fast_airtime", "Usually within minutes"),
          },
        ],
      };
    }

    if (form.transferType === "send_money") {
      return {
        icon: HandCoins,
        title: tr("payments.form.transfer_types.send_money.label", "Send Money"),
        subtitle: tr(
          "payments.form.send_money.subtitle",
          "Move support to Zimbabwe with a clear fee view, live exchange-rate visibility, and simple payout choices."
        ),
        trustPoints: [
          {
            icon: ShieldCheck,
            className: "text-emerald-400",
            label: tr("payments.form.trust.encrypted", "Bank-level encryption"),
          },
          {
            icon: CheckCircle2,
            className: "text-zim-gold",
            label: tr("payments.form.trust.quote", "Quote before you pay"),
          },
          {
            icon: Clock3,
            className: "text-zim-gold",
            label: tr("payments.form.trust.fast", "Fast & traceable"),
          },
        ],
      };
    }

    return {
      icon: HandCoins,
      title: tr("payments.form.title", "Send Money"),
      subtitle: tr(
        "payments.form.subtitle",
        "Send your money easy, fast and securely from the comfort of your home to Zimbabwe."
      ),
      trustPoints: [
        {
          icon: ShieldCheck,
          className: "text-emerald-400",
          label: tr("payments.form.trust.encrypted", "Bank-level encryption"),
        },
        {
          icon: CheckCircle2,
          className: "text-zim-gold",
          label: tr("payments.form.trust.no_hidden_fees", "No hidden fees"),
        },
        {
          icon: Clock3,
          className: "text-zim-gold",
          label: tr("payments.form.trust.fast", "Fast & traceable"),
        },
      ],
    };
  }, [form.transferType, t]);
  const routeSummary = showRouteSummary ? (
    <div className="space-y-2" aria-live="polite">
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!hideQuoteAmountSummaryCards && (
          <div className={summaryCardClass}>
            <p className={summaryLabelClass}>
              {tr("payments.form.fields.they_receive", "They receive")}
            </p>
            <p className={displayedReceiveAmount > 0 ? summaryMetricClass : summaryValueClass}>
              {displayedReceiveAmount > 0
                ? formatAmount(displayedReceiveAmount, displayReceiveCurrency)
                : tr("payments.form.quote.fetching", "Fetching rate...")}
            </p>
          </div>
        )}

        {!hideQuoteAmountSummaryCards && (
          <div className={summaryCardClass}>
            <p className={summaryLabelClass}>
              {tr("payments.form.fee", "Fee")}
            </p>
            <p className={typeof fee === "number" && Number.isFinite(fee) ? summaryMetricClass : summaryValueClass}>
              {displayFeeText}
            </p>
          </div>
        )}

        <div className={summaryCardClass}>
          <p className={summaryLabelClass}>
            {tr("payments.form.quote.fx_rate", "FX Rate")}
          </p>
          <p className={displayFxRate > 0 ? summaryMetricClass : summaryValueClass}>
            {fxRateDisplayText}
          </p>
        </div>

        {showMobileProvidersSummaryCard && (
          <div className={summaryCardClass}>
            <p className={summaryLabelClass}>
              {tr("payments.form.mobile_money.providers_supported_label", "Mobile providers")}
            </p>
            <p className={summaryMetricClass}>{mobileProvidersSummaryText}</p>
          </div>
        )}

        <div className={summaryCardClass}>
          <p className={summaryLabelClass}>
            {tr("payments.form.eta_label", "Estimated reflect time")}
          </p>
          <p className={`mt-1.5 inline-flex items-start gap-1.5 ${summaryValueClass}`}>
            <Clock3 className="mt-0.5 h-3 w-3 shrink-0 text-zim-gold" aria-hidden="true" />
            <span>{payoutEta}</span>
          </p>
        </div>
      </div>

    </div>
  ) : null;

  return (
    <section className="outer-glass-panel relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 text-white shadow-[0_20px_40px_rgba(2,6,23,0.45)]">
      {showTransferTypeSelector && (
        <div className="relative mb-5">
          <div className="relative z-10 text-center">
            <div className="mb-3 flex items-center justify-center gap-3">
              <activeFlowMeta.icon className="h-6 w-6 text-zim-gold" aria-hidden="true" />
              <h3 className="text-xl font-black tracking-tight">{activeFlowMeta.title}</h3>
            </div>
            <p className="text-sm text-white/70">{activeFlowMeta.subtitle}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
              {activeFlowMeta.trustPoints.map((point, index) => (
                <div key={point.label} className="contents">
                  {index > 0 && <span className="hidden h-3 w-px bg-white/15 sm:block" aria-hidden="true" />}
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-white/50">
                    <point.icon className={`h-3 w-3 ${point.className}`} aria-hidden="true" />
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Screen-reader announcement of the current step — updated on every step change */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {(() => {
          const current = activeFlowSteps[currentStepIndex];
          if (!current) return null;
          return `Step ${currentStepIndex + 1} of ${activeFlowSteps.length}: ${tr(current.labelKey, current.labelFallback)}`;
        })()}
      </p>

      <div className="mb-8 flex items-start">
        {activeFlowSteps.map((item, index) => {
          const completed = currentStepIndex > index;
          const current = currentStepIndex === index;
          const isLast = index === activeFlowSteps.length - 1;
          const isClickable = completed && item.id !== "status";
          return (
            <React.Fragment key={item.id}>
              <div className="flex flex-col items-center gap-1.5 flex-none">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && setStep(item.id)}
                  aria-label={`Step ${index + 1}: ${tr(item.labelKey, item.labelFallback)}${current ? " — current step" : completed ? " — completed, click to go back" : " — upcoming"}`}
                  aria-current={current ? "step" : undefined}
                  title={isClickable ? `Go back to ${item.labelFallback}` : undefined}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all duration-300 ${
                    completed
                      ? "border-zim-gold bg-zim-gold text-black"
                      : current
                        ? "border-zim-gold bg-zim-gold/15 text-zim-gold shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                        : "border-white/15 bg-white/[0.03] text-white/30"
                  } ${isClickable ? "cursor-pointer hover:opacity-80 hover:scale-110" : "cursor-default"}`}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
                </button>
                <span
                  className={`text-center text-[10px] font-black uppercase tracking-[0.06em] leading-tight whitespace-nowrap ${
                    completed || current ? "text-zim-gold" : "text-white/30"
                  }`}
                >
                  {tr(item.labelKey, item.labelFallback)}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 self-start mt-4 rounded-full transition-all duration-500 ${
                    completed ? "bg-zim-gold" : "bg-white/10"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {step === "route" && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="sender-country" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.fields.sender_country", "Where are you sending from?")}
              </label>
              <select
                id="sender-country"
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
              {autoDetectedSenderCountryCode && form.senderCountryCode === autoDetectedSenderCountryCode ? (
                <p className="mt-1.5 text-[11px] text-emerald-300/80">
                  {tr("payments.form.fields.sender_country_detected", "Detected from your location")}
                </p>
              ) : senderCountryDetectionResolved ? (
                <p className="mt-1.5 text-[11px] text-white/45">
                  {tr("payments.form.fields.sender_country_auto", "Selected automatically. You can still change it.")}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-white/45">
                  {tr("payments.form.fields.sender_country_detecting", "Detecting your location...")}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="receiver-country" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.fields.receiver_country", "Receiver country")}
              </label>
              <select
                id="receiver-country"
                className={fieldClass}
                value={form.receiverCountryCode}
                onChange={(e) => {
                  const selected = RECEIVER_COUNTRIES.find((c) => c.code === e.target.value) ?? DEFAULT_RECEIVER_COUNTRY;
                  setForm((prev) => ({
                    ...prev,
                    receiverCountryCode: selected.code,
                    currencyTo: selected.currency,
                    // Clear quote-dependent fields when corridor changes.
                    amountSent: "",
                    amountReceive: "",
                  }));
                }}
              >
                {RECEIVER_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {getLocalizedRegionName(country.code, i18n.language, country.name)} ({country.currency})
                  </option>
                ))}
              </select>
            </div>

            {form.transferType === "send_money" && (
              <div>
                <label htmlFor="amount-sent" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.fields.you_send", "You send")} ({displaySendCurrency})
                </label>
                <div className="relative">
                  <input
                    id="amount-sent"
                    className={`${fieldClass} pr-16`}
                    type="number"
                    min="1"
                    max={String(maxTransferAmount)}
                    value={form.amountSent}
                    onChange={(e) => updateAmountSent(e.target.value)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/70">
                    {displaySendCurrency}
                  </span>
                </div>
              </div>
            )}
          </div>

          {showTransferTypeSelector && (
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr(
                  "payments.form.fields.transfer_type",
                  "Select Send Money or Airtime Top-up to continue."
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
          )}

          {/* Airtime: collect phone number here so operator detection runs immediately */}
          {form.transferType === "airtime_topup" && (
            <div>
              <label htmlFor="airtime-phone-route" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.recipient.airtime_number", "Zimbabwe number to top up")}
              </label>
              <div className="relative">
                <input
                  id="airtime-phone-route"
                  type="tel"
                  className={`${fieldClass} ${airtimeLookupLoading ? "pr-10" : ""}`}
                  placeholder={tr("payments.form.recipient.phone_placeholder", "+2637XXXXXXXX")}
                  value={form.recipientPhone}
                  onChange={(e) => update("recipientPhone", e.target.value)}
                />
                {airtimeLookupLoading && (
                  <span className="absolute inset-y-0 right-3 flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin text-zim-gold/70" />
                  </span>
                )}
              </div>
              {airtimeLookupLoading && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/50">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tr("payments.form.airtime.detecting_operator", "Detecting operator...")}
                </p>
              )}
              {!airtimeLookupLoading && airtimeOperator && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  {`${String(airtimeOperator?.name ?? tr("payments.form.airtime.operator", "Operator"))} ${tr("payments.form.airtime.detected", "detected")}`}
                </p>
              )}
            </div>
          )}

          {routeSummary}

          {showGetStartedButton ? (
            renderActionFooter(
              <button
                type="button"
                data-testid="payments-get-started"
                className={continueButtonClass}
                disabled={loading || !canStart}
                onClick={onGetStarted}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading
                  ? tr("payments.form.actions.loading_rate", "Loading quote...")
                  : tr("payments.form.actions.continue", "Continue")}
              </button>
            )
          ) : null}
        </div>
      )}

      {/* Method step — send_money only, choose delivery method */}
      {step === "method" && form.transferType === "send_money" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white/70">
              {tr("payments.form.method.heading", "How should the money be delivered?")}
            </h3>
            <p className="mt-1 text-[11px] text-white/40">
              {tr("payments.form.method.subheading", "Choose a delivery method for your recipient in Zimbabwe.")}
            </p>
          </div>

          <div className="space-y-2">
            {[
              {
                value: "mobile_money" as const,
                icon: Smartphone,
                title: tr("payments.form.payout_types.mobile_money", "Mobile Money"),
                description: tr("payments.form.method.mobile_money_desc", "Sent directly to an EcoCash wallet. Instant and widely accepted across Zimbabwe."),
                eta: tr("payments.form.eta.mobile_money", "Usually within minutes to 2 hours."),
                tag: tr("payments.form.method.most_popular", "Most popular"),
              },
              {
                value: "bank_transfer" as const,
                icon: Building2,
                title: tr("payments.form.payout_types.bank_transfer", "Bank Transfer"),
                description: tr("payments.form.method.bank_transfer_desc", "Direct to a Zimbabwe bank account. Supported banks: ZB Bank, CBZ, BancABC, Steward Bank."),
                eta: tr("payments.form.eta.bank_transfer", "Usually 1–3 business days."),
                tag: null,
              },
              {
                value: "cash_pickup" as const,
                icon: HandCoins,
                title: tr("payments.form.payout_types.cash_pickup", "Cash Pickup"),
                description: tr("payments.form.method.cash_pickup_desc", "Recipient collects cash in person at a supported pickup location after confirmation."),
                eta: tr("payments.form.eta.cash_pickup", "Usually within 1 hour after provider confirmation."),
                tag: null,
              },
            ].map((method) => {
              const Icon = method.icon;
              const selected = form.recipientType === method.value;
              return (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => update("recipientType", method.value)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
                    selected
                      ? "border-zim-gold/50 bg-zim-gold/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 rounded-xl p-2 ${selected ? "bg-zim-gold/20" : "bg-white/[0.05]"}`}>
                      <Icon className={`h-4 w-4 ${selected ? "text-zim-gold" : "text-white/50"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold ${selected ? "text-zim-gold" : "text-white/90"}`}>
                          {method.title}
                        </span>
                        {method.tag && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            {method.tag}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/50">{method.description}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-white/35">
                        <Clock3 className="h-3 w-3 shrink-0" />
                        {method.eta}
                      </p>
                    </div>
                    <div className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      selected ? "border-zim-gold bg-zim-gold" : "border-white/20"
                    }`}>
                      {selected && <Check className="h-2.5 w-2.5 text-black" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {routeSummary}

          {renderActionFooter(
            <>
              <button type="button" className={pillSecondaryClass} onClick={() => setStep("route")}>
                {tr("payments.form.actions.back", "Back")}
              </button>
              <button type="button" className={continueButtonClass} onClick={onContinueMethod}>
                {tr("payments.form.actions.continue", "Continue")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Recipient step — send_money only; includes identity + method-specific delivery details */}
      {step === "recipient" && form.transferType === "send_money" && (
        <div className="space-y-5">
          {/* Identity fields */}
          <div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="recipient-first-name" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.first_name", "Name")}
                </label>
                <input
                  id="recipient-first-name"
                  className={fieldClass}
                  value={form.recipientFirstName}
                  onChange={(e) => update("recipientFirstName", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="recipient-middle-name" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.middle_name", "Middle name")}
                </label>
                <input
                  id="recipient-middle-name"
                  className={fieldClass}
                  value={form.recipientMiddleName}
                  onChange={(e) => update("recipientMiddleName", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="recipient-surname" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.surname", "Surname")}
                </label>
                <input
                  id="recipient-surname"
                  className={fieldClass}
                  value={form.recipientSurname}
                  onChange={(e) => update("recipientSurname", e.target.value)}
                />
              </div>
            </div>
          </div>

          {form.recipientType === "mobile_money" ? (
            <div className="space-y-2">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label htmlFor="recipient-address" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.address", "Receiver address")}
                  </label>
                  <input
                    id="recipient-address"
                    className={fieldClass}
                    placeholder={tr("payments.form.recipient.address_placeholder", "Street / Suburb")}
                    value={form.recipientAddress}
                    onChange={(e) => update("recipientAddress", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="recipient-city" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.city", "City")}
                  </label>
                  <input id="recipient-city" className={fieldClass} value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="ecocash-number" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.payout.ecocash_number", "EcoCash Wallet Number (required)")}
                  </label>
                  <input
                    id="ecocash-number"
                    type="tel"
                    className={fieldClass}
                    placeholder={tr("payments.form.recipient.phone_placeholder", "+2637XXXXXXXX")}
                    value={form.mobileNumber}
                    onChange={(e) => update("mobileNumber", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-[11px] text-white/40">
                {tr("payments.form.method.ecocash_required_note", "Enter the recipient's EcoCash wallet number.")}
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="recipient-address" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.recipient.address", "Receiver address")}
                </label>
                <input
                  id="recipient-address"
                  className={fieldClass}
                  placeholder={tr("payments.form.recipient.address_placeholder", "Street / Suburb")}
                  value={form.recipientAddress}
                  onChange={(e) => update("recipientAddress", e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="recipient-city" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.city", "City")}
                  </label>
                  <input id="recipient-city" className={fieldClass} value={form.recipientCity} onChange={(e) => update("recipientCity", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="recipient-phone" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.recipient.phone", "Phone number")}
                  </label>
                  <input
                    id="recipient-phone"
                    type="tel"
                    className={fieldClass}
                    placeholder={tr("payments.form.recipient.phone_placeholder", "+2637XXXXXXXX")}
                    value={form.recipientPhone}
                    onChange={(e) => update("recipientPhone", e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* Delivery details — varies by chosen method */}

          {form.recipientType === "cash_pickup" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="cash-pickup-mobile" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.recipient_mobile", "Recipient Mobile Number")}
                </label>
                <input
                  id="cash-pickup-mobile"
                  type="tel"
                  className={fieldClass}
                  placeholder={tr("payments.form.recipient.phone_placeholder", "+2637XXXXXXXX")}
                  value={form.mobileNumber}
                  onChange={(e) => update("mobileNumber", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="cash-pickup-location" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.cash_pickup_location", "Preferred pickup city or area")}
                </label>
                <input
                  id="cash-pickup-location"
                  className={fieldClass}
                  placeholder={tr("payments.form.payout.cash_pickup_location_placeholder", "e.g. Harare, Bulawayo, Victoria Falls")}
                  value={form.cashPickupLocation}
                  onChange={(e) => update("cashPickupLocation", e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-amber-200">{tr("payments.form.payout.cash_pickup_id_title", "ID required at collection")}</p>
                <p className="text-[11px] leading-snug text-amber-200/80">{tr("payments.form.payout.cash_pickup_id_note", "The recipient must present valid government-issued ID matching the name")} <strong>{recipientFullName || tr("payments.form.payout.cash_pickup_name_fallback", "above")}</strong> {tr("payments.form.payout.cash_pickup_id_note_2", "when collecting. A reference number will be sent to their mobile after confirmation.")}</p>
              </div>
            </div>
          )}

          {form.recipientType === "bank_transfer" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="bank-name" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.payout.bank_name", "Bank")}
                  </label>
                  <select id="bank-name" className={fieldClass} value={form.bankName} onChange={(e) => update("bankName", e.target.value)}>
                    <option value="">{tr("payments.form.payout.select_bank", "Select bank")}</option>
                    {supportedBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="bank-account" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                    {tr("payments.form.payout.bank_account_number", "Account Number")}
                  </label>
                  <input
                    id="bank-account"
                    className={fieldClass}
                    placeholder={tr("payments.form.payout.account_number_placeholder", "Account number")}
                    value={form.bankAccountNumber}
                    onChange={(e) => update("bankAccountNumber", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="bank-account-confirm" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                  {tr("payments.form.payout.confirm_account", "Confirm Account Number")}
                </label>
                <input
                  id="bank-account-confirm"
                  className={fieldClass}
                  placeholder={tr("payments.form.payout.account_number_placeholder", "Re-enter account number")}
                  value={bankAccountConfirm}
                  onChange={(e) => setBankAccountConfirm(e.target.value)}
                />
                {form.bankAccountNumber && !looksLikeBankAccountNumber(form.bankAccountNumber) && (
                  <p className="mt-1 text-[11px] text-rose-400">
                    {tr("payments.form.payout.account_invalid", "Enter a valid account number using 6 to 20 letters or digits.")}
                  </p>
                )}
                {bankAccountConfirm && form.bankAccountNumber !== bankAccountConfirm && (
                  <p className="mt-1 text-[11px] text-rose-400">{tr("payments.form.payout.account_mismatch", "Account numbers do not match.")}</p>
                )}
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] p-3">
                <p className="text-[11px] leading-snug text-amber-200/80">{tr("payments.form.payout.bank_irreversible_note", "Funds sent to an incorrect account number cannot be reversed. Please verify the account details carefully before continuing.")}</p>
              </div>
            </div>
          )}

          {routeSummary}

          {renderActionFooter(
            <>
              <button
                type="button"
                className={pillSecondaryClass}
                onClick={() => { setStep(forcedRecipientType ? "route" : "method"); setBankAccountConfirm(""); }}
              >
                {tr("payments.form.actions.back", "Back")}
              </button>
              <button
                type="button"
                className={continueButtonClass}
                onClick={onContinueRecipient}
                disabled={loading || !canContinueRecipient}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading
                  ? tr("payments.form.actions.loading_rate", "Verifying...")
                  : tr("payments.form.actions.continue", "Continue")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Payout step — airtime only: confirm operator and choose top-up amount */}
      {step === "payout" && form.transferType === "airtime_topup" && (
        <div className="space-y-5">
          {/* Operator confirmation */}
          <div className={`flex items-center gap-3 rounded-2xl border p-4 ${airtimeOperator ? "border-emerald-400/20 bg-emerald-500/10" : "border-white/10 bg-white/[0.03]"}`}>
            <div className={`rounded-xl p-2 ${airtimeOperator ? "bg-emerald-500/20" : "bg-white/[0.05]"}`}>
              <Smartphone className={`h-4 w-4 ${airtimeOperator ? "text-emerald-400" : "text-white/40"}`} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                {tr("payments.form.airtime.operator", "Operator")}
              </p>
              <p className={`text-sm font-bold ${airtimeOperator ? "text-emerald-300" : "text-white/40"}`}>
                {airtimeOperator
                  ? String(airtimeOperator.name ?? tr("payments.form.airtime.operator", "Operator"))
                  : tr("payments.form.airtime.detecting", "Auto-detecting...")}
              </p>
              <p className="text-[10px] text-white/35">
                {tr("payments.form.airtime.topup_phone", "Top-up number")}: {normalizeZimbabweNumber(form.recipientPhone)}
              </p>
            </div>
            {airtimeOperator && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-400" />}
          </div>

          {/* Suggested amount quick-picks */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-white/70">
              {tr("payments.form.airtime.options", "How much airtime to send? (USD)")}
            </label>
            {airtimeOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {airtimeOptions.slice(0, 8).map((value) => {
                  const isSelected = (parseAmountInput(form.amountReceive) ?? 0) === Number(value);
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      className={`${optionPillClass} ${
                        isSelected
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
                    >
                      {value} USD
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/50">
                {tr("payments.form.airtime.no_options", "No suggested amounts yet.")}
              </p>
            )}

            {/* Manual amount input */}
            <div className="mt-2">
              <label htmlFor="airtime-amount-send" className="mb-1 block text-[10px] font-black uppercase tracking-widest text-white/70">
                {tr("payments.form.fields.you_send", "You send")} ({displaySendCurrency})
              </label>
              <div className="relative">
                <input
                  id="airtime-amount-send"
                  className={`${fieldClass} pr-16`}
                  type="number"
                  min="1"
                  max={String(maxTransferAmount)}
                  value={form.amountSent}
                  onChange={(e) => updateAmountSent(e.target.value)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-black uppercase tracking-widest text-white/70">
                  {displaySendCurrency}
                </span>
              </div>
              {amount > 0 && fxRate > 0 && (
                <p className="mt-1 text-[11px] text-white/50">
                  ≈ {formatAmount(amount * fxRate, displayReceiveCurrency)} airtime
                </p>
              )}
            </div>
          </div>

          {routeSummary}

          {renderActionFooter(
            <>
              <button
                type="button"
                className={pillSecondaryClass}
                onClick={() => setStep("route")}
                disabled={loading}
              >
                {tr("payments.form.actions.back", "Back")}
              </button>
              <button
                type="button"
                className={continueButtonClass}
                onClick={onContinuePayout}
                disabled={loading || !canContinuePayout}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading
                  ? tr("payments.form.actions.loading_rate", "Verifying...")
                  : tr("payments.form.actions.continue", "Continue")}
              </button>
            </>
          )}
        </div>
      )}

      {step === "pay" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h4 className="mb-3 text-sm font-black uppercase tracking-widest text-white/70">
              {reviewHeading}
            </h4>
            <div className="grid gap-2 text-sm text-white/80">
              {reviewRows.map((item) => (
                <div key={`${item.label}-${item.value}`} className="flex items-start justify-between gap-3">
                  <span className="text-white/55">{item.label}</span>
                  <span className={`text-right font-semibold ${item.accent ? "text-zim-gold" : "text-white"}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-zim-gold/30 bg-zim-gold/10 p-4 text-xs text-zim-gold/90">
              <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" />
                {tr("payments.form.pay.settlement_timing", "Settlement timing")}
              </div>
              {payoutEta}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-zim-gold">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {tr("payments.form.review.delivery_check", "Delivery check")}
              </div>
              <p className="text-sm font-light leading-relaxed text-white/72">
                {deliveryGuidance}
              </p>
            </div>
          </div>

          {renderActionFooter(
            <>
              <button
                type="button"
                className={pillSecondaryClass}
                onClick={() => setStep(form.transferType === "airtime_topup" ? "payout" : "recipient")}
                disabled={loading}
              >
                {tr("payments.form.actions.edit", "Edit")}
              </button>
              <button
                type="button"
                className={`${pillPrimaryClass} gap-2`}
                onClick={onPay}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? reviewSubmittingLabel : reviewPrimaryActionLabel}
              </button>
            </>
          )}
        </div>
      )}

      {step === "status" && status && (
        <div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <h4 className="text-sm font-black uppercase tracking-widest">
              {statusHeading}
            </h4>
          </div>

          <div className="grid gap-2 rounded-xl border border-emerald-400/15 bg-emerald-900/20 p-4 text-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">
                {tr("payments.form.status.status", "Status")}
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-200 capitalize">
                {String(status.transaction?.status || tr("payments.form.status.pending", "pending")).toLowerCase().replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-start justify-between gap-2 flex-wrap border-t border-emerald-400/10 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">
                {tr("payments.form.status.reference", "Reference")}
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-100 text-right break-all">
                {status.transaction?.provider_reference ||
                  status.transaction?.reloadly_reference ||
                  tr("payments.form.status.pending_title", "Pending")}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-emerald-400/10 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">
                {tr("payments.form.fields.you_send", "You send")}
              </span>
              <span className="text-sm font-bold text-emerald-100">{formatAmount(amount, displaySendCurrency)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-emerald-400/10 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300/70">
                {tr("payments.form.fields.they_receive", "They receive")}
              </span>
              <span className="text-sm font-bold text-zim-gold">{formatAmount(displayedReceiveAmount, displayReceiveCurrency)}</span>
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-emerald-200/80">
            <Clock3 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            {payoutEta}
          </p>
          {renderActionFooter(
            <>
              <button
                type="button"
                className={`${pillSuccessClass} gap-2`}
                onClick={downloadReceipt}
                disabled={receiptDownloading}
              >
                {receiptDownloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {receiptDownloading
                  ? tr("payments.form.actions.downloading", "Downloading...")
                  : tr("payments.form.actions.download_receipt", "Download Receipt")}
              </button>
              <button
                type="button"
                className={pillSecondaryClass}
                onClick={onNewTransfer}
              >
                {tr("payments.form.actions.new_transfer", "New Transfer")}
              </button>
            </>
          )}
        </div>
      )}

      {error && (
        <div role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" aria-hidden="true" />
          <p className="flex-1 text-sm text-rose-200 leading-snug">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="shrink-0 text-rose-400/60 hover:text-rose-300 transition-colors"
            aria-label={tr("payments.form.dismiss_error", "Dismiss error")}
          >
            ✕
          </button>
        </div>
      )}

    </section>
  );
}
