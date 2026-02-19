import axios from "axios";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  createNtirEntity,
  createFeatureNotification,
  createSuccessStory,
  consumePasswordResetToken,
  createPasswordResetToken,
  createSession,
  createUser,
  db,
  deleteSession,
  findUserByEmail,
  findUserById,
  getFeatureNotifications,
  getEconomicStats,
  getNtirEntities,
  getSession,
  getSuccessStories,
  initializeDatabase,
  searchNtirEntities,
  updateNtirEntity,
  updateUserPassword,
  listShopProducts,
  createShopOrder,
  getShopOrderByRef,
  confirmShopOrderPayment,
  getShopProductsAdmin,
  createShopProductAdmin,
  updateShopProductAdmin,
  deleteShopProductAdmin,
} from "./db";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_COOKIE = "zigd_session";
const DEFAULT_ONESA_SYSTEM_PROMPT = [
  "You are Onesa AI, a Zimbabwe-focused diaspora decision-support assistant.",
  "Be warm, clear, and conversational.",
  "If the user sends a simple greeting (for example: hello, hi, hey, mhoro, hesi, ndeipi), respond briefly in 1-2 short sentences and ask one simple follow-up question.",
  "Do not auto-translate or explain language unless the user explicitly asks for translation.",
  "Do not dump long bullet lists unless the user asks for detailed guidance.",
  "For normal requests, provide practical and concise guidance for tourism, trade, and investment, and clearly mark uncertainty.",
].join(" ");
const ONESA_READINESS_CACHE_MS = 120000;
const ONESA_READINESS_GRACE_MS = 120000;
const SERVER_STARTED_AT = Date.now();

type OnesaReadiness = {
  ok: boolean;
  ready: boolean;
  provider: string;
  model: string;
  endpoint: string;
  resolvedModel?: string | null;
  message?: string;
};

let onesaReadinessCache: { checkedAt: number; value: OnesaReadiness } | null = null;
let lastOnesaSuccessAt = 0;
const onesaProviderBackoffUntilByEndpoint = new Map<string, number>();

function getAllowedCorsOrigins(): string[] {
  const fromEnv = String(process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    "https://diasporaunlocked.com",
    "https://www.diasporaunlocked.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];

  return Array.from(new Set([...defaults, ...fromEnv]));
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;
  const checkHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(checkHash, "hex"));
}

function getCookie(req: express.Request, key: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const entries = raw.split(";").map((x) => x.trim());
  for (const entry of entries) {
    const [k, ...v] = entry.split("=");
    if (k === key) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setSessionCookie(res: express.Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  const maxAge = 7 * 24 * 60 * 60;
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`
  );
}

function clearSessionCookie(res: express.Response) {
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`
  );
}

async function resolveAuthToken(req: express.Request): Promise<string | null> {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.replace("Bearer ", "");
  return getCookie(req, SESSION_COOKIE);
}

async function resolveAuthUser(req: express.Request) {
  const token = await resolveAuthToken(req);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  const user = await findUserById(Number(session.user_id));
  if (!user) return null;
  return user;
}

function isAdminEmail(email: string): boolean {
  const configured = String(process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (configured.length === 0) return false;
  return configured.includes(email.trim().toLowerCase());
}

async function sendResetEmail(to: string, resetUrl: string) {
  const provider = process.env.RESET_EMAIL_PROVIDER?.toLowerCase() ?? "resend";
  const from = process.env.FROM_EMAIL ?? "no-reply@zigd-platform.com";

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[reset-email:dry-run] ${to} -> ${resetUrl}`);
      return;
    }

    await axios.post(
      "https://api.resend.com/emails",
      {
        from,
        to: [to],
        subject: "Reset your ZIGD password",
        html: `<p>We received a request to reset your password.</p><p><a href=\"${resetUrl}\">Reset Password</a></p><p>If you did not request this, ignore this email.</p>`,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  console.log(`[reset-email:unsupported-provider:${provider}] ${to} -> ${resetUrl}`);
}

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type SupportedOnesaLanguage = "en" | "sn" | "nd" | "de";

function normalizeOnesaLanguage(value: unknown): SupportedOnesaLanguage {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "sn" || base === "nd" || base === "de" || base === "en") return base;
  if (raw === "shona") return "sn";
  if (raw === "ndebele") return "nd";
  if (raw === "german" || raw === "deutsch") return "de";
  return "en";
}

function getOnesaLanguageLabel(language: SupportedOnesaLanguage): string {
  if (language === "sn") return "Shona";
  if (language === "nd") return "Ndebele";
  if (language === "de") return "German";
  return "English";
}

function getOnesaLanguageFallbackReply(language: SupportedOnesaLanguage): string {
  if (language === "sn") {
    return "Pane dambudziko diki pakugadzira mhinduro izvozvi. Ndapota edza zvakare munguva pfupi.";
  }
  if (language === "nd") {
    return "Kukhona inkinga encane ekuphenduleni okwamanje. Sicela uzame njalo ngemva kwesikhatshana.";
  }
  if (language === "de") {
    return "Ich habe gerade ein kleines Problem beim Antworten. Bitte versuchen Sie es in Kürze erneut.";
  }
  return "I am having trouble generating a reliable response right now. Please try again.";
}

function getUpstreamStatus(error: any): number {
  return Number(error?.response?.status ?? 0);
}

function getEndpointBackoffRemainingMs(endpointKey: string): number {
  const now = Date.now();
  const until = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
  return Math.max(0, until - now);
}

function getGlobalBackoffRemainingMs(): number {
  const now = Date.now();
  let maxRemaining = 0;
  onesaProviderBackoffUntilByEndpoint.forEach((until) => {
    maxRemaining = Math.max(maxRemaining, Math.max(0, until - now));
  });
  return maxRemaining;
}

function parseRetryAfterMs(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const text = String(value).trim();
  if (!text) return null;

  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(0, Math.floor(seconds * 1000));
  }

  const dateMs = Date.parse(text);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }
  return null;
}

function getRetryAfterMs(error: any): number | null {
  const headers = error?.response?.headers ?? {};
  const retryAfter =
    parseRetryAfterMs(headers["retry-after"]) ??
    parseRetryAfterMs(headers["x-ratelimit-reset-after"]) ??
    parseRetryAfterMs(headers["x-rate-limit-reset"]);
  return retryAfter;
}

function isRateLimitedUpstreamError(error: any): boolean {
  const status = getUpstreamStatus(error);
  if (status === 429) return true;
  const message = String(error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests") || message.includes("status code 429");
}

function isRetryableUpstreamError(error: any): boolean {
  if (isRateLimitedUpstreamError(error)) return true;
  const status = getUpstreamStatus(error);
  return status === 503 || status === 504 || status === 529;
}

async function withRetry<T>(run: () => Promise<T>, maxAttempts = 3, endpointKey?: string): Promise<T> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await run();
    } catch (error: any) {
      lastError = error;
      if (isRateLimitedUpstreamError(error)) {
        const retryAfterMs = getRetryAfterMs(error);
        const jitterMs = Math.floor(Math.random() * 250);
        const fallbackBackoffMs = 10000 + jitterMs;
        const delayMs = Math.max(fallbackBackoffMs, retryAfterMs ?? 0);
        if (endpointKey) {
          const existing = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
          onesaProviderBackoffUntilByEndpoint.set(endpointKey, Math.max(existing, Date.now() + delayMs));
        }
        // Immediately fail over to the next provider endpoint for 429s.
        throw error;
      }
      if (!isRetryableUpstreamError(error) || attempt === maxAttempts) {
        throw error;
      }
      const retryAfterMs = getRetryAfterMs(error);
      const jitterMs = Math.floor(Math.random() * 250);
      const backoffMs = Math.min(15000, 700 * (2 ** (attempt - 1))) + jitterMs;
      const delayMs = Math.max(backoffMs, retryAfterMs ?? 0);
      if (isRateLimitedUpstreamError(error) && endpointKey) {
        const existing = onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
        onesaProviderBackoffUntilByEndpoint.set(endpointKey, Math.max(existing, Date.now() + delayMs));
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function getLatestUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg?.role === "user" && typeof msg.content === "string") {
      const text = msg.content.trim();
      if (text) return text;
    }
  }
  return "";
}

function normalizeSmallTalkPhrase(content: string): string {
  const normalized = content.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  if (!normalized) return "";
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length > 4) return "";
  return tokens.join(" ");
}

function detectLatestUserLanguage(content: string): SupportedOnesaLanguage | null {
  const greetingLanguage = detectGreetingLanguage(content);
  if (greetingLanguage) return greetingLanguage;

  const normalized = content.trim().toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const score = { en: 0, sn: 0, nd: 0, de: 0 } as Record<SupportedOnesaLanguage, number>;
  const has = (set: Set<string>, word: string) => set.has(word);
  const snWords = new Set(["mhoro", "ndeip", "ndeipi", "makadii", "maswera", "sei", "ndatenda", "mazvita", "nding", "kubatsira"]);
  const ndWords = new Set(["sawubona", "salibonani", "kunjani", "ngiyabonga", "nxa", "lamuhla", "ngingakuncedisa"]);
  const deWords = new Set(["hallo", "guten", "danke", "bitte", "ich", "und", "wie", "kann"]);
  const enWords = new Set(["hello", "hi", "hey", "thanks", "thank", "you", "how", "can", "help", "today"]);

  for (const word of words) {
    if (has(snWords, word) || word.startsWith("ndi")) score.sn += 1;
    if (has(ndWords, word) || word.startsWith("ngi")) score.nd += 1;
    if (has(deWords, word)) score.de += 1;
    if (has(enWords, word)) score.en += 1;
  }

  const ranked = (Object.keys(score) as SupportedOnesaLanguage[]).sort((a, b) => score[b] - score[a]);
  const top = ranked[0];
  if (score[top] <= 0) return null;
  const second = ranked[1];
  if (score[top] === score[second]) return null;
  return top;
}

function isMixedLanguageReply(reply: string, expectedLanguage: SupportedOnesaLanguage): boolean {
  const normalized = reply.toLowerCase();
  if (expectedLanguage === "en") return false;

  const englishMarkers = [
    "how can i",
    "i can",
    "you can",
    "please",
    "today",
    "investment",
    "trade",
    "tourism",
  ];
  const swahiliMarkers = ["kwa kutumia", "kama ", " au ", "mifumo yote", "naweza", "leo"];
  const englishHits = englishMarkers.reduce((count, marker) => (normalized.includes(marker) ? count + 1 : count), 0);

  if (expectedLanguage === "sn") {
    const swahiliHits = swahiliMarkers.reduce((count, marker) => (normalized.includes(marker) ? count + 1 : count), 0);
    return englishHits >= 2 || swahiliHits >= 1;
  }

  if (expectedLanguage === "nd" || expectedLanguage === "de") {
    return englishHits >= 2;
  }

  return false;
}

function detectGreetingLanguage(content: string): SupportedOnesaLanguage | null {
  const phrase = normalizeSmallTalkPhrase(content);
  if (!phrase) return null;

  const greetingsByLanguage: Record<SupportedOnesaLanguage, Set<string>> = {
    en: new Set([
    "hi",
    "hello",
    "hey",
    "yo",
    "howdy",
    "good morning",
    "good afternoon",
    "good evening",
    ]),
    sn: new Set([
      "mhoro",
      "hesi",
      "ndeipi",
      "ndeip",
      "ndepi",
      "makadii",
      "maswera sei",
    ]),
    nd: new Set([
      "salibonani",
      "sawubona",
      "kunjani",
    ]),
    de: new Set([
      "hallo",
      "guten tag",
      "guten morgen",
      "guten abend",
      "servus",
    ]),
  };

  for (const language of Object.keys(greetingsByLanguage) as SupportedOnesaLanguage[]) {
    if (greetingsByLanguage[language].has(phrase)) return language;
  }
  return null;
}

function getSmallTalkReply(
  content: string,
  defaultLanguage: SupportedOnesaLanguage
): string | null {
  const normalized = content.trim().toLowerCase();
  const greetingLanguage = detectGreetingLanguage(normalized);
  if (greetingLanguage) {
    const language = greetingLanguage ?? defaultLanguage;
    if (language === "sn") return "Mhoro! Ndini Onesa. Ndingakubatsirai nei nhasi?";
    if (language === "nd") return "Sawubona! Ngingu Onesa. Ngingakuncedisa ngani lamuhla?";
    if (language === "de") return "Hallo! Ich bin Onesa. Wie kann ich dir heute helfen?";
    return "Hi! I am Onesa. How can I help you today?";
  }
  return null;
}

type CloudProviderTarget = {
  name: "primary" | "secondary" | "tertiary" | "claude" | "cerebras";
  kind: "openai" | "anthropic";
  baseUrl: string;
  apiKey: string;
  models: string[];
  anthropicVersion?: string;
};

function isPlaceholderApiKey(value: string): boolean {
  const normalized = value.trim();
  return (
    !normalized ||
    normalized === "YOUR_GEMINI_API_KEY" ||
    normalized === "YOUR_GROQ_API_KEY" ||
    normalized.startsWith("YOUR_")
  );
}

function buildCloudProviderTargets(config: ReturnType<typeof getOnesaConfig>): CloudProviderTarget[] {
  const primaryModels = Array.from(
    new Set([...config.modelCandidates, config.model, config.fallbackModel].filter(Boolean))
  );
  const secondaryModels = Array.from(
    new Set(
      [...config.secondaryModelCandidates, config.secondaryModel, config.secondaryFallbackModel].filter(Boolean)
    )
  );
  const tertiaryModels = Array.from(
    new Set(
      [...config.tertiaryModelCandidates, config.tertiaryModel, config.tertiaryFallbackModel].filter(Boolean)
    )
  );
  const claudeModels = Array.from(
    new Set([...config.claudeModelCandidates, config.claudeModel, config.claudeFallbackModel].filter(Boolean))
  );
  const cerebrasModels = Array.from(
    new Set([...config.cerebrasModelCandidates, config.cerebrasModel, config.cerebrasFallbackModel].filter(Boolean))
  );

  const targets: CloudProviderTarget[] = [];
  if (!isPlaceholderApiKey(config.openaiApiKey)) {
    targets.push({
      name: "primary",
      kind: "openai",
      baseUrl: config.openaiBase,
      apiKey: config.openaiApiKey,
      models: primaryModels.length > 0 ? primaryModels : [config.model],
    });
  }
  if (config.secondaryOpenaiBase && !isPlaceholderApiKey(config.secondaryOpenaiApiKey)) {
    targets.push({
      name: "secondary",
      kind: "openai",
      baseUrl: config.secondaryOpenaiBase,
      apiKey: config.secondaryOpenaiApiKey,
      models: secondaryModels.length > 0 ? secondaryModels : [config.secondaryModel || config.model],
    });
  }
  if (config.tertiaryOpenaiBase && !isPlaceholderApiKey(config.tertiaryOpenaiApiKey)) {
    targets.push({
      name: "tertiary",
      kind: "openai",
      baseUrl: config.tertiaryOpenaiBase,
      apiKey: config.tertiaryOpenaiApiKey,
      models: tertiaryModels.length > 0 ? tertiaryModels : [config.tertiaryModel || config.model],
    });
  }
  if (!isPlaceholderApiKey(config.claudeApiKey)) {
    targets.push({
      name: "claude",
      kind: "anthropic",
      baseUrl: config.claudeBase || "https://api.anthropic.com",
      apiKey: config.claudeApiKey,
      models: claudeModels.length > 0 ? claudeModels : [config.model],
      anthropicVersion: config.claudeAnthropicVersion,
    });
  }
  if (!isPlaceholderApiKey(config.cerebrasApiKey)) {
    targets.push({
      name: "cerebras",
      kind: "openai",
      baseUrl: config.cerebrasBase || "https://api.cerebras.ai/v1",
      apiKey: config.cerebrasApiKey,
      models: cerebrasModels.length > 0 ? cerebrasModels : [config.model],
    });
  }
  return targets;
}

function getOnesaConfig() {
  const provider = (process.env.ONESA_PROVIDER ?? "ollama").toLowerCase();
  const model = process.env.ONESA_MODEL ?? "llama3.1:8b";
  const fallbackModel =
    process.env.ONESA_FALLBACK_MODEL ?? (provider === "openai_compatible" ? model : "llama3.1:8b");
  const modelCandidates = String(process.env.ONESA_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const secondaryModel = process.env.ONESA_SECONDARY_MODEL ?? "";
  const secondaryFallbackModel = process.env.ONESA_SECONDARY_FALLBACK_MODEL ?? "";
  const secondaryModelCandidates = String(process.env.ONESA_SECONDARY_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const tertiaryModel = process.env.ONESA_TERTIARY_MODEL ?? "";
  const tertiaryFallbackModel = process.env.ONESA_TERTIARY_FALLBACK_MODEL ?? "";
  const tertiaryModelCandidates = String(process.env.ONESA_TERTIARY_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const claudeBase = String(process.env.ONESA_CLAUDE_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const claudeApiKey = process.env.ONESA_CLAUDE_API_KEY ?? "";
  const claudeModel = process.env.ONESA_CLAUDE_MODEL ?? "";
  const claudeFallbackModel = process.env.ONESA_CLAUDE_FALLBACK_MODEL ?? "";
  const claudeModelCandidates = String(process.env.ONESA_CLAUDE_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const claudeAnthropicVersion = process.env.ONESA_CLAUDE_ANTHROPIC_VERSION ?? "2023-06-01";
  const cerebrasBase = String(process.env.ONESA_CEREBRAS_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const cerebrasApiKey = process.env.ONESA_CEREBRAS_API_KEY ?? "";
  const cerebrasModel = process.env.ONESA_CEREBRAS_MODEL ?? "";
  const cerebrasFallbackModel = process.env.ONESA_CEREBRAS_FALLBACK_MODEL ?? "";
  const cerebrasModelCandidates = String(process.env.ONESA_CEREBRAS_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const ollamaBase = (process.env.ONESA_OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
  const openaiBase = (process.env.ONESA_AI_BASE_URL ?? "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
  const openaiApiKey = process.env.ONESA_AI_API_KEY ?? "";
  const secondaryOpenaiBase = String(process.env.ONESA_SECONDARY_AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const secondaryOpenaiApiKey = process.env.ONESA_SECONDARY_AI_API_KEY ?? "";
  const tertiaryOpenaiBase = String(process.env.ONESA_TERTIARY_AI_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const tertiaryOpenaiApiKey = process.env.ONESA_TERTIARY_AI_API_KEY ?? "";
  const timeoutRaw = Number(process.env.ONESA_REQUEST_TIMEOUT_MS ?? "180000");
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 180000;
  const maxTokensRaw = Number(process.env.ONESA_MAX_TOKENS ?? "220");
  const maxTokens = Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? Math.floor(maxTokensRaw) : 220;
  return {
    provider,
    model,
    fallbackModel,
    modelCandidates,
    secondaryModel,
    secondaryFallbackModel,
    secondaryModelCandidates,
    tertiaryModel,
    tertiaryFallbackModel,
    tertiaryModelCandidates,
    claudeBase,
    claudeApiKey,
    claudeModel,
    claudeFallbackModel,
    claudeModelCandidates,
    claudeAnthropicVersion,
    cerebrasBase,
    cerebrasApiKey,
    cerebrasModel,
    cerebrasFallbackModel,
    cerebrasModelCandidates,
    ollamaBase,
    openaiBase,
    openaiApiKey,
    secondaryOpenaiBase,
    secondaryOpenaiApiKey,
    tertiaryOpenaiBase,
    tertiaryOpenaiApiKey,
    timeoutMs,
    maxTokens,
  };
}

function resolveOllamaModelName(requestedModel: string, availableModels: string[]): string | null {
  if (!requestedModel) return null;
  if (availableModels.includes(requestedModel)) return requestedModel;

  const hasTag = requestedModel.includes(":");
  if (!hasTag) {
    const latestCandidate = `${requestedModel}:latest`;
    if (availableModels.includes(latestCandidate)) return latestCandidate;
  }

  const requestedBase = requestedModel.split(":")[0];
  const sameBase = availableModels.filter((m) => m.split(":")[0] === requestedBase);
  if (sameBase.length > 0) {
    const latest = sameBase.find((m) => m.endsWith(":latest"));
    return latest ?? sameBase[0];
  }

  return null;
}

function isOllamaModelNotFoundError(error: any): boolean {
  const message = String(error?.response?.data?.error ?? error?.message ?? "").toLowerCase();
  return message.includes("model") && message.includes("not found");
}

function isLowQualityOnesaReply(reply: string): boolean {
  const text = reply.trim().toLowerCase();
  if (!text) return true;

  if (text.includes("translate from en to en")) return true;
  const notedCount = (text.match(/\bnoted\b/g) ?? []).length;
  if (notedCount >= 3) return true;

  const normalized = text.replace(/\s+/g, " ").trim();
  const segments = normalized.split(/[.!?]\s+/).map((s) => s.trim()).filter(Boolean);
  if (segments.length >= 4) {
    const segmentCounts = new Map<string, number>();
    for (const segment of segments) {
      segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
    }
    if (Array.from(segmentCounts.values()).some((count) => count >= 3)) {
      return true;
    }
  }

  const words = normalized.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 20) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.35) return true;
  }

  return false;
}

function buildAnthropicInput(messages: ChatMessage[]) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  const chatMessages = messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
  return { system, chatMessages };
}

function extractAnthropicText(data: any): string {
  const content = data?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((block: any) => block?.type === "text" && typeof block?.text === "string")
    .map((block: any) => String(block.text).trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function generateOnesaReply(messages: ChatMessage[], requestedLanguage?: string) {
  const config = getOnesaConfig();
  const { provider, model, fallbackModel, ollamaBase, openaiBase, timeoutMs, maxTokens } = config;
  const systemPrompt = process.env.ONESA_SYSTEM_PROMPT ?? DEFAULT_ONESA_SYSTEM_PROMPT;
  const preferredLanguage = normalizeOnesaLanguage(requestedLanguage);
  const latestUserMessage = getLatestUserMessage(messages);
  const detectedUserLanguage = latestUserMessage ? detectLatestUserLanguage(latestUserMessage) : null;
  const responseLanguage = detectedUserLanguage ?? preferredLanguage;
  const languageInstruction = [
    `Respond only in ${getOnesaLanguageLabel(responseLanguage)}.`,
    "Do not mix languages in the same response unless the user explicitly asks.",
    "Always respond in the same language as the user's latest message.",
    `If the latest message language is ambiguous, use ${getOnesaLanguageLabel(responseLanguage)} only.`,
    "If the user switches language, switch with them.",
    "Do not translate unless the user asks for translation.",
  ].join(" ");
  const safeFallbackReply = getOnesaLanguageFallbackReply(responseLanguage);
  const smallTalkReply = latestUserMessage
    ? getSmallTalkReply(latestUserMessage, responseLanguage)
    : null;
  if (smallTalkReply) {
    lastOnesaSuccessAt = Date.now();
    return smallTalkReply;
  }
  const normalizedMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: languageInstruction },
    ...messages.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()),
  ];

  if (provider === "openai_compatible") {
    const providers = buildCloudProviderTargets(config);
    if (providers.length === 0) {
      throw new Error("No configured cloud provider with valid API key.");
    }
    const anthropicInput = buildAnthropicInput(normalizedMessages);

    let lastRateLimitError: any = null;
    let lastError: any = null;
    let longestBackoffMs = 0;

    for (const providerTarget of providers) {
      const providerBackoffMs = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
      if (providerBackoffMs > 0) {
        longestBackoffMs = Math.max(longestBackoffMs, providerBackoffMs);
        continue;
      }

      let shouldSkipEndpoint = false;
      for (const targetModel of providerTarget.models) {
        if (shouldSkipEndpoint || getEndpointBackoffRemainingMs(providerTarget.baseUrl) > 0) {
          break;
        }
        try {
          const response = await withRetry(
            () => {
              if (providerTarget.kind === "anthropic") {
                return axios.post(
                  `${providerTarget.baseUrl}/v1/messages`,
                  {
                    model: targetModel,
                    system: anthropicInput.system || undefined,
                    messages: anthropicInput.chatMessages,
                    temperature: 0.3,
                    max_tokens: maxTokens,
                  },
                  {
                    timeout: timeoutMs,
                    headers: {
                      "x-api-key": providerTarget.apiKey,
                      "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
                      "Content-Type": "application/json",
                    },
                  }
                );
              }
              return axios.post(
                `${providerTarget.baseUrl}/chat/completions`,
                {
                  model: targetModel,
                  messages: normalizedMessages,
                  temperature: 0.3,
                  max_tokens: maxTokens,
                },
                {
                  timeout: timeoutMs,
                  headers: {
                    Authorization: `Bearer ${providerTarget.apiKey}`,
                    "Content-Type": "application/json",
                  },
                }
              );
            },
            3,
            providerTarget.baseUrl
          );
          const reply =
            providerTarget.kind === "anthropic"
              ? extractAnthropicText(response.data)
              : String(response.data?.choices?.[0]?.message?.content ?? "").trim();
          if (reply && !isLowQualityOnesaReply(reply) && !isMixedLanguageReply(reply, responseLanguage)) {
            lastOnesaSuccessAt = Date.now();
            return reply;
          }
        } catch (error: any) {
          if (isRateLimitedUpstreamError(error)) {
            lastRateLimitError = error;
            const remaining = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
            longestBackoffMs = Math.max(longestBackoffMs, remaining, getRetryAfterMs(error) ?? 0);
            shouldSkipEndpoint = true;
            break;
          }
          const status = getUpstreamStatus(error);
          if (status === 401 || status === 403) {
            // Invalid key/permissions for this endpoint; skip to next provider.
            lastError = error;
            shouldSkipEndpoint = true;
            break;
          }
          lastError = error;
          // Try next model on same provider endpoint.
          continue;
        }
      }
    }

    if (lastRateLimitError) {
      const retryAfterMs = longestBackoffMs > 0 ? longestBackoffMs : getRetryAfterMs(lastRateLimitError);
      if (retryAfterMs && retryAfterMs > 0) {
        const existing = Number(lastRateLimitError?.response?.headers?.["retry-after"] ?? 0);
        if (!existing) {
          lastRateLimitError.response = {
            ...(lastRateLimitError.response ?? {}),
            status: 429,
            headers: {
              ...(lastRateLimitError.response?.headers ?? {}),
              "retry-after": Math.ceil(retryAfterMs / 1000),
            },
            data: {
              ...(lastRateLimitError.response?.data ?? {}),
              message: "Rate limited",
            },
          };
        }
      }
      throw lastRateLimitError;
    }
    if (lastError) throw lastError;
    return safeFallbackReply;
  }

  const buildPromptFromMessages = (chatMessages: ChatMessage[]) =>
    chatMessages
      .map((m) => {
        if (m.role === "system") return `System: ${m.content}`;
        if (m.role === "assistant") return `Assistant: ${m.content}`;
        return `User: ${m.content}`;
      })
      .join("\n\n");

  const extractOllamaText = (data: any) =>
    String(data?.message?.content ?? data?.response ?? data?.content ?? "").trim();

  const sendOllamaChat = async (targetModel: string) => {
    const response = await axios.post(
      `${ollamaBase}/api/chat`,
      {
        model: targetModel,
        messages: normalizedMessages,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaText(response.data);
  };

  const sendOllamaGenerate = async (targetModel: string) => {
    const response = await axios.post(
      `${ollamaBase}/api/generate`,
      {
        model: targetModel,
        prompt: buildPromptFromMessages(normalizedMessages),
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: timeoutMs,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaText(response.data);
  };

  const tryModel = async (targetModel: string): Promise<string> => {
    try {
      const chatReply = await sendOllamaChat(targetModel);
      if (chatReply) return chatReply;
    } catch {
      // Fall back to /api/generate for models that don't support chat templates.
    }
    return await sendOllamaGenerate(targetModel);
  };

  let availableModels: string[] = [];
  try {
    const tagsResponse = await axios.get(`${ollamaBase}/api/tags`, { timeout: 5000 });
    availableModels = Array.isArray(tagsResponse.data?.models)
      ? tagsResponse.data.models.map((m: any) => String(m?.name ?? ""))
      : [];
  } catch {
    // Tags endpoint unavailable: continue with requested model only.
  }

  const candidates = Array.from(
    new Set([model, resolveOllamaModelName(model, availableModels)].filter((m): m is string => Boolean(m)))
  );
  const fallbackCandidates = Array.from(
    new Set([fallbackModel, resolveOllamaModelName(fallbackModel, availableModels)].filter((m): m is string => Boolean(m)))
  ).filter((candidate) => !candidates.includes(candidate));

  let lastError: any = null;
  let lowQualityReply: string | null = null;
  for (const candidate of candidates) {
    try {
      const reply = await tryModel(candidate);
      if (reply) {
        if (isLowQualityOnesaReply(reply)) {
          lowQualityReply = reply;
          continue;
        }
        lastOnesaSuccessAt = Date.now();
        return reply;
      }
    } catch (error: any) {
      lastError = error;
    }
  }

  for (const candidate of fallbackCandidates) {
    try {
      const reply = await tryModel(candidate);
      if (reply) {
        if (isLowQualityOnesaReply(reply)) {
          lowQualityReply = reply;
          continue;
        }
        lastOnesaSuccessAt = Date.now();
        return reply;
      }
    } catch (error: any) {
      lastError = error;
    }
  }

  if (lowQualityReply) {
    return safeFallbackReply;
  }
  if (lastError) throw lastError;
  throw new Error(
    `Onesa model returned an empty response for: ${[...candidates, ...fallbackCandidates].join(", ") || model}`
  );
}

async function getOnesaHealth() {
  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase } = config;
  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    if (providerTargets.length === 0) {
      const claudeConfigured =
        Boolean(config.claudeBase) ||
        Boolean(config.claudeApiKey) ||
        Boolean(config.claudeModel) ||
        Boolean(config.claudeFallbackModel) ||
        config.claudeModelCandidates.length > 0;
      const cerebrasConfigured =
        Boolean(config.cerebrasBase) ||
        Boolean(config.cerebrasApiKey) ||
        Boolean(config.cerebrasModel) ||
        Boolean(config.cerebrasFallbackModel) ||
        config.cerebrasModelCandidates.length > 0;
      const tiers = [
        { name: "primary", base: config.openaiBase, key: config.openaiApiKey },
        { name: "secondary", base: config.secondaryOpenaiBase, key: config.secondaryOpenaiApiKey },
        { name: "tertiary", base: config.tertiaryOpenaiBase, key: config.tertiaryOpenaiApiKey },
        ...(claudeConfigured ? [{ name: "claude", base: config.claudeBase || "https://api.anthropic.com", key: config.claudeApiKey }] : []),
        ...(cerebrasConfigured ? [{ name: "cerebras", base: config.cerebrasBase || "https://api.cerebras.ai/v1", key: config.cerebrasApiKey }] : []),
      ].filter((tier) => Boolean(tier.base));
      const missingKeyTiers = tiers.filter((tier) => isPlaceholderApiKey(tier.key)).map((tier) => tier.name);

      let message = "Cloud AI provider is missing configuration.";
      if (tiers.length > 0 && missingKeyTiers.length === tiers.length) {
        message = "Cloud AI API keys are missing.";
      } else if (missingKeyTiers.length > 0) {
        message = `Cloud AI API key missing for: ${missingKeyTiers.join(", ")}.`;
      }

      return {
        ok: false,
        provider,
        model,
        endpoint: openaiBase,
        message,
      };
    }

    const failures: string[] = [];
    for (const providerTarget of providerTargets) {
      try {
        if (providerTarget.kind === "anthropic") {
          await axios.get(`${providerTarget.baseUrl}/v1/models`, {
            timeout: 5000,
            headers: {
              "x-api-key": providerTarget.apiKey,
              "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
              "Content-Type": "application/json",
            },
          });
        } else {
          await axios.get(`${providerTarget.baseUrl}/models`, {
            timeout: 5000,
            headers: {
              Authorization: `Bearer ${providerTarget.apiKey}`,
              "Content-Type": "application/json",
            },
          });
        }
        return { ok: true, provider, model, endpoint: providerTarget.baseUrl };
      } catch (error: any) {
        const status = Number(error?.response?.status ?? 0);
        if (status === 404 || status === 405) {
          // Some providers may not expose a models list endpoint.
          return { ok: true, provider, model, endpoint: providerTarget.baseUrl };
        }
        failures.push(`${providerTarget.name}:${String(error?.message ?? "unknown error")}`);
      }
    }
    return {
      ok: false,
      provider,
      model,
      endpoint: openaiBase,
      message: `Cloud endpoint unreachable: ${failures.join(" | ") || "unknown error"}`,
    };
  }

  try {
    const response = await axios.get(`${ollamaBase}/api/tags`, { timeout: 5000 });
    const availableModels: string[] = Array.isArray(response.data?.models)
      ? response.data.models.map((m: any) => String(m?.name ?? ""))
      : [];
    const resolvedModel = resolveOllamaModelName(model, availableModels);
    const modelAvailable = Boolean(resolvedModel);
    return {
      ok: modelAvailable,
      provider,
      model,
      resolvedModel,
      endpoint: ollamaBase,
      modelAvailable,
      availableModels,
      message: modelAvailable ? undefined : `Model "${model}" not found in Ollama.`,
    };
  } catch (error: any) {
    return {
      ok: false,
      provider,
      model,
      endpoint: ollamaBase,
      message: `Ollama unreachable: ${String(error?.message ?? "unknown error")}`,
    };
  }
}

async function getOnesaReadiness() {
  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase, timeoutMs } = config;
  const fallbackEndpoint = provider === "openai_compatible" ? openaiBase : ollamaBase;
  const now = Date.now();
  const probeTimeout = Math.min(timeoutMs, 10000);

  if (onesaReadinessCache && now - onesaReadinessCache.checkedAt < ONESA_READINESS_CACHE_MS) {
    return onesaReadinessCache.value;
  }

  const remember = (value: OnesaReadiness) => {
    onesaReadinessCache = { checkedAt: Date.now(), value };
    return value;
  };

  const health = await getOnesaHealth();
  const endpoint = String((health as any)?.endpoint ?? fallbackEndpoint);
  if (!health.ok) {
    return remember({
      ok: false,
      ready: false,
      provider,
      model,
      endpoint,
      message: String(health.message ?? "Onesa is unavailable."),
    });
  }

  const recentSuccess = now - lastOnesaSuccessAt < ONESA_READINESS_GRACE_MS;
  if (recentSuccess) {
    return remember({
      ok: true,
      ready: true,
      provider,
      model,
      endpoint,
      resolvedModel: provider === "ollama" ? String((health as any)?.resolvedModel ?? model) : undefined,
    });
  }

  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    if (providerTargets.length === 0) {
      return remember({
        ok: false,
        ready: false,
        provider,
        model,
        endpoint,
        message: "Onesa is unavailable.",
      });
    }

    let observedRateLimit = false;
    let lastFailureMessage = "";

    for (const providerTarget of providerTargets) {
      const endpointBackoffMs = getEndpointBackoffRemainingMs(providerTarget.baseUrl);
      if (endpointBackoffMs > 0) {
        observedRateLimit = true;
        continue;
      }

      try {
        if (providerTarget.kind === "anthropic") {
          await axios.get(`${providerTarget.baseUrl}/v1/models`, {
            timeout: probeTimeout,
            headers: {
              "x-api-key": providerTarget.apiKey,
              "anthropic-version": providerTarget.anthropicVersion ?? "2023-06-01",
              "Content-Type": "application/json",
            },
          });
        } else {
          await axios.get(`${providerTarget.baseUrl}/models`, {
            timeout: probeTimeout,
            headers: {
              Authorization: `Bearer ${providerTarget.apiKey}`,
              "Content-Type": "application/json",
            },
          });
        }
        return remember({
          ok: true,
          ready: true,
          provider,
          model: providerTarget.models[0] ?? model,
          endpoint: providerTarget.baseUrl,
        });
      } catch (error: any) {
        const status = getUpstreamStatus(error);
        if (status === 404 || status === 405) {
          // Some providers do not expose a models endpoint consistently.
          return remember({
            ok: true,
            ready: true,
            provider,
            model: providerTarget.models[0] ?? model,
            endpoint: providerTarget.baseUrl,
          });
        }
        if (isRateLimitedUpstreamError(error)) {
          observedRateLimit = true;
          const retryAfterMs = getRetryAfterMs(error) ?? 10000;
          const existing = onesaProviderBackoffUntilByEndpoint.get(providerTarget.baseUrl) ?? 0;
          onesaProviderBackoffUntilByEndpoint.set(
            providerTarget.baseUrl,
            Math.max(existing, Date.now() + Math.min(30000, retryAfterMs))
          );
          continue;
        }
        if (status === 401 || status === 403) {
          lastFailureMessage = "Authentication failed.";
          continue;
        }
        lastFailureMessage = String(error?.message ?? "probe failed");
      }
    }

    const globalBackoffMs = getGlobalBackoffRemainingMs();
    return remember({
      ok: false,
      ready: false,
      provider,
      model,
      endpoint,
      message:
        observedRateLimit && globalBackoffMs > 0
          ? "Onesa is temporarily rate-limited."
          : lastFailureMessage
            ? "Onesa is unavailable."
            : "Onesa is unavailable.",
    });
  }

  try {
    const resolvedModel = String((health as any)?.resolvedModel ?? model);
    const response = await axios.post(
      `${ollamaBase}/api/generate`,
      {
        model: resolvedModel,
        prompt: "ready",
        stream: false,
        options: {
          temperature: 0,
          num_predict: 4,
        },
      },
      {
        timeout: probeTimeout,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const reply = String(response.data?.response ?? "").trim();
    const ready = reply.length > 0;
    if (ready) {
      lastOnesaSuccessAt = Date.now();
    }
    return remember({
      ok: ready,
      ready,
      provider,
      model,
      endpoint,
      resolvedModel,
      message: ready ? undefined : "Onesa is unavailable.",
    });
  } catch {
    const stillWarm = Date.now() - lastOnesaSuccessAt < ONESA_READINESS_GRACE_MS;
    return remember({
      ok: stillWarm,
      ready: stillWarm,
      provider,
      model,
      endpoint,
      resolvedModel: provider === "ollama" ? String((health as any)?.resolvedModel ?? model) : undefined,
      message: stillWarm ? undefined : "Onesa is unavailable.",
    });
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const allowedOrigins = getAllowedCorsOrigins();

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          // Non-browser clients (curl/health checks/server-to-server).
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.use(express.json());
  try {
    await initializeDatabase();
  } catch (error) {
    console.warn("[db] Database initialization failed. Continuing with in-memory fallback mode.");
    console.warn(error);
  }

  app.get("/api/economic-stats", async (_req, res) => {
    try {
      const stats = await getEconomicStats();
      res.json(stats);
    } catch {
      res.status(500).json({ message: "Failed to load economic stats." });
    }
  });

  app.get("/api/health/db", async (_req, res) => {
    if (!db) {
      return res.json({ ok: true, mode: "memory-fallback", message: "No MySQL env vars set. Using in-memory fallback." });
    }
    try {
      await db.query("SELECT 1");
      return res.json({ ok: true, mode: "mysql" });
    } catch {
      return res.status(500).json({ ok: false, mode: "mysql", error: "Database connection failed." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { fullName, email, password, confirmPassword } = req.body ?? {};
      if (!fullName || !email || !password) {
        return res.status(400).json({ message: "Full name, email, and password are required." });
      }
      if (String(password).length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const existingUser = await findUserByEmail(String(email));
      if (existingUser) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const user = await createUser(String(fullName), String(email), hashPassword(String(password)));
      const session = await createSession(Number(user.id));
      setSessionCookie(res, session.token);

      return res.status(201).json({
        message: "Account created successfully.",
        user: { id: user.id, fullName: user.full_name, email: user.email },
      });
    } catch (error: any) {
      const isDev = (process.env.NODE_ENV ?? "development") !== "production";
      const detail = error?.message ? ` ${String(error.message)}` : "";
      return res.status(500).json({
        message: isDev ? `Registration failed.${detail}` : "Registration failed.",
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required." });
      }

      const user = await findUserByEmail(String(email));
      if (!user || !verifyPassword(String(password), String(user.password_hash))) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const session = await createSession(Number(user.id));
      setSessionCookie(res, session.token);

      return res.json({
        message: "Login successful.",
        user: { id: user.id, fullName: user.full_name, email: user.email },
      });
    } catch {
      return res.status(500).json({ message: "Login failed." });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const token = await resolveAuthToken(req);
    if (token) await deleteSession(token);
    clearSessionCookie(res);
    return res.json({ message: "Logged out." });
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body ?? {};
      if (!email) return res.status(400).json({ message: "Email is required." });

      const user = await findUserByEmail(String(email));
      if (user) {
        const tokenData = await createPasswordResetToken(Number(user.id));
        const appBaseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.NODE_ENV === "production" ? 3000 : 5000}`;
        const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(tokenData.token)}`;
        await sendResetEmail(String(user.email), resetUrl);
      }

      return res.json({ message: "If this email exists, a reset link has been sent." });
    } catch {
      return res.status(500).json({ message: "Unable to process password reset request." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body ?? {};
      if (!token || !password) return res.status(400).json({ message: "Token and password are required." });
      if (String(password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      if (confirmPassword !== undefined && password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const resetToken = await consumePasswordResetToken(String(token));
      if (!resetToken) return res.status(400).json({ message: "Reset token is invalid or expired." });

      await updateUserPassword(Number(resetToken.user_id), hashPassword(String(password)));
      return res.json({ message: "Password reset successful. Please sign in." });
    } catch {
      return res.status(500).json({ message: "Password reset failed." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const token = await resolveAuthToken(req);
    if (!token) return res.status(401).json({ message: "Unauthorized." });

    const session = await getSession(token);
    if (!session) return res.status(401).json({ message: "Session expired." });

    const user = await findUserById(Number(session.user_id));
    if (!user) return res.status(401).json({ message: "User not found." });

    return res.json({
      user: { id: user.id, fullName: user.full_name, email: user.email },
    });
  });

  app.get("/api/search", async (req, res) => {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (!q) return res.json({ query: "", count: 0, results: [] });

    try {
      const routeIndex = [
        { title: "Exports", href: "/exports", category: "Trade", tags: ["export", "germany", "market", "trade"] },
        { title: "Tourism", href: "/tourism", category: "Tourism", tags: ["visit", "travel", "attractions", "victoria falls"] },
        { title: "Investment", href: "/investment", category: "Investment", tags: ["money", "capital", "projects", "masuwe", "sez"] },
        { title: "Trade", href: "/trade", category: "Trade", tags: ["business", "commerce", "sectors"] },
        { title: "Technology", href: "/technology", category: "Technology", tags: ["ai", "onesa", "innovation", "tech"] },
        { title: "Success Stories", href: "/success-stories", category: "Impact", tags: ["stories", "impact", "cases"] },
        { title: "NTIR Database", href: "/ntir", category: "Trade", tags: ["register", "ntir", "verification"] },
        { title: "Regulations", href: "/regulations", category: "Compliance", tags: ["regulation", "compliance", "zida"] },
      ];

      const routeMatches = routeIndex.filter((item) =>
        [item.title, item.category, ...item.tags].some((value) => value.toLowerCase().includes(q))
      );
      const ntirMatches = (await searchNtirEntities(q)).slice(0, 10).map((row: any) => ({
        title: row.name,
        href: "/ntir",
        category: "NTIR",
        summary: `${row.sector} - ${row.location}`,
      }));
      const storyMatches = (await getSuccessStories(false))
        .filter((story: any) =>
          [story.title, story.category, story.story, story.author].some((value) => String(value ?? "").toLowerCase().includes(q))
        )
        .slice(0, 10)
        .map((story: any) => ({
          title: story.title,
          href: "/success-stories",
          category: story.category || "Impact",
          summary: String(story.story ?? "").slice(0, 140),
        }));

      const results = [...routeMatches, ...ntirMatches, ...storyMatches];
      return res.json({ query: q, count: results.length, results });
    } catch {
      return res.status(500).json({ message: "Unable to run search right now." });
    }
  });

  app.post("/api/feature-notifications", async (req, res) => {
    try {
      const feature = String(req.body?.feature ?? "").trim();
      if (!feature) return res.status(400).json({ message: "Feature is required." });

      const token = await resolveAuthToken(req);
      if (!token) return res.status(401).json({ message: "Unauthorized." });

      const session = await getSession(token);
      if (!session) return res.status(401).json({ message: "Session expired." });

      const user = await findUserById(Number(session.user_id));
      if (!user) return res.status(401).json({ message: "User not found." });

      const result = await createFeatureNotification(Number(user.id), String(user.email), feature);
      return res.status(200).json({
        message: result.created ? "Notify request saved." : "Notify request already exists.",
        created: result.created,
        feature,
        email: String(user.email),
      });
    } catch (error: any) {
      const isDev = (process.env.NODE_ENV ?? "development") !== "production";
      const detail = error?.message ? ` ${String(error.message)}` : "";
      return res.status(500).json({
        message: isDev ? `Unable to save notify request.${detail}` : "Unable to save notify request.",
      });
    }
  });

  app.get("/api/success-stories", async (_req, res) => {
    try {
      const stories = await getSuccessStories(false);
      return res.json({ count: stories.length, stories });
    } catch {
      return res.status(500).json({ message: "Unable to load success stories." });
    }
  });

  app.get("/api/admin/overview", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });

    const [notifyRows, ntirRows, storyRows] = await Promise.all([
      getFeatureNotifications(),
      getNtirEntities(),
      getSuccessStories(true),
    ]);
    return res.json({
      ok: true,
      user: { id: user.id, fullName: user.full_name, email: user.email },
      counts: {
        notifyRequests: notifyRows.length,
        ntirEntities: ntirRows.length,
        successStories: storyRows.length,
      },
    });
  });

  app.get("/api/admin/notify-requests", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const rows = await getFeatureNotifications();
    return res.json({ count: rows.length, rows });
  });

  app.get("/api/admin/ntir", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const rows = await getNtirEntities();
    return res.json({ count: rows.length, rows });
  });

  app.post("/api/admin/ntir", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });

    const name = String(req.body?.name ?? "").trim();
    const sector = String(req.body?.sector ?? "").trim();
    const location = String(req.body?.location ?? "").trim();
    const verificationStatus = String(req.body?.verification_status ?? "Pending").trim() === "Verified" ? "Verified" : "Pending";
    if (!name || !sector || !location) return res.status(400).json({ message: "Name, sector, and location are required." });

    const row = await createNtirEntity(name, sector, location, verificationStatus);
    return res.status(201).json({ row });
  });

  app.put("/api/admin/ntir/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid entity id." });
    const payload = {
      name: req.body?.name !== undefined ? String(req.body.name).trim() : undefined,
      sector: req.body?.sector !== undefined ? String(req.body.sector).trim() : undefined,
      location: req.body?.location !== undefined ? String(req.body.location).trim() : undefined,
      verification_status:
        req.body?.verification_status !== undefined
          ? String(req.body.verification_status).trim() === "Verified"
            ? ("Verified" as const)
            : ("Pending" as const)
          : undefined,
    };
    const row = await updateNtirEntity(id, payload);
    if (!row) return res.status(404).json({ message: "NTIR entity not found." });
    return res.json({ row });
  });

  app.get("/api/admin/success-stories", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const stories = await getSuccessStories(true);
    return res.json({ count: stories.length, stories });
  });

  app.post("/api/admin/success-stories", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });

    const payload = {
      title: String(req.body?.title ?? "").trim(),
      category: String(req.body?.category ?? "").trim(),
      image: String(req.body?.image ?? "").trim(),
      story: String(req.body?.story ?? "").trim(),
      testimonial: String(req.body?.testimonial ?? "").trim(),
      author: String(req.body?.author ?? "").trim(),
      role: String(req.body?.role ?? "").trim(),
      revenue: String(req.body?.revenue ?? "").trim(),
      jobs: String(req.body?.jobs ?? "").trim(),
      markets: String(req.body?.markets ?? "").trim(),
      is_published: req.body?.is_published === false ? (0 as const) : (1 as const),
    };
    if (!payload.title || !payload.category || !payload.story || !payload.author) {
      return res.status(400).json({ message: "Title, category, story, and author are required." });
    }

    const story = await createSuccessStory(payload);
    return res.status(201).json({ story });
  });

  app.get("/api/admin/shop-products", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const rows = await getShopProductsAdmin();
    return res.json({ count: rows.length, rows });
  });

  app.post("/api/admin/shop-products", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });

    const slug = String(req.body?.slug ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    const category = String(req.body?.category ?? "").trim().toLowerCase();
    const description = String(req.body?.description ?? "").trim();
    const image_url = String(req.body?.image_url ?? "").trim();
    const price_cents = Number(req.body?.price_cents ?? 0);
    const currency = String(req.body?.currency ?? "EUR").trim().toUpperCase();
    const stock_qty = Math.max(0, Math.floor(Number(req.body?.stock_qty ?? 0)));
    const is_active = req.body?.is_active === 0 || req.body?.is_active === false ? (0 as const) : (1 as const);

    if (!slug || !name || !description || !image_url) {
      return res.status(400).json({ message: "Slug, name, description and image are required." });
    }
    if (!["sports", "crafts", "food"].includes(category)) {
      return res.status(400).json({ message: "Category must be sports, crafts, or food." });
    }
    if (!Number.isFinite(price_cents) || price_cents <= 0) {
      return res.status(400).json({ message: "Price must be greater than zero." });
    }

    try {
      const row = await createShopProductAdmin({
        slug,
        name,
        category: category as "sports" | "crafts" | "food",
        description,
        image_url,
        price_cents: Math.floor(price_cents),
        currency: currency || "EUR",
        stock_qty,
        is_active,
      });
      return res.status(201).json({ row });
    } catch (error: any) {
      return res.status(400).json({ message: String(error?.message ?? "Unable to create product.") });
    }
  });

  app.put("/api/admin/shop-products/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid product id." });

    const rawCategory = req.body?.category !== undefined ? String(req.body.category).trim().toLowerCase() : undefined;
    if (rawCategory !== undefined && !["sports", "crafts", "food"].includes(rawCategory)) {
      return res.status(400).json({ message: "Category must be sports, crafts, or food." });
    }
    const rawPrice = req.body?.price_cents !== undefined ? Number(req.body.price_cents) : undefined;
    if (rawPrice !== undefined && (!Number.isFinite(rawPrice) || rawPrice <= 0)) {
      return res.status(400).json({ message: "Price must be greater than zero." });
    }
    const rawStock = req.body?.stock_qty !== undefined ? Number(req.body.stock_qty) : undefined;
    if (rawStock !== undefined && (!Number.isFinite(rawStock) || rawStock < 0)) {
      return res.status(400).json({ message: "Stock must be zero or greater." });
    }

    const payload: any = {};
    if (req.body?.slug !== undefined) payload.slug = String(req.body.slug).trim();
    if (req.body?.name !== undefined) payload.name = String(req.body.name).trim();
    if (req.body?.description !== undefined) payload.description = String(req.body.description).trim();
    if (req.body?.image_url !== undefined) payload.image_url = String(req.body.image_url).trim();
    if (rawCategory !== undefined) payload.category = rawCategory;
    if (rawPrice !== undefined) payload.price_cents = Math.floor(rawPrice);
    if (req.body?.currency !== undefined) payload.currency = String(req.body.currency).trim().toUpperCase();
    if (rawStock !== undefined) payload.stock_qty = Math.floor(rawStock);
    if (req.body?.is_active !== undefined) payload.is_active = req.body.is_active === 0 || req.body.is_active === false ? 0 : 1;

    const row = await updateShopProductAdmin(id, payload);
    if (!row) return res.status(404).json({ message: "Product not found." });
    return res.json({ row });
  });

  app.delete("/api/admin/shop-products/:id", async (req, res) => {
    const user = await resolveAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized." });
    if (!isAdminEmail(String(user.email))) return res.status(403).json({ message: "Admin access required." });
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid product id." });
    const deleted = await deleteShopProductAdmin(id);
    if (!deleted) return res.status(404).json({ message: "Product not found." });
    return res.json({ ok: true });
  });

  app.get("/api/ntir/search", async (req, res) => {
    const query = String(req.query.q ?? "");
    try {
      const results = await searchNtirEntities(query);
      return res.json({ query, count: results.length, results });
    } catch {
      return res.status(500).json({ message: "Unable to search NTIR database." });
    }
  });

  app.get("/api/shop/products", async (req, res) => {
    try {
      const category = String(req.query.category ?? "").trim();
      const products = await listShopProducts(category);
      return res.json({ count: products.length, products });
    } catch {
      return res.status(500).json({ message: "Unable to load shop products." });
    }
  });

  app.post("/api/shop/orders", async (req, res) => {
    try {
      const customerName = String(req.body?.customerName ?? "").trim();
      const customerEmail = String(req.body?.customerEmail ?? "").trim();
      const shippingCountry = String(req.body?.shippingCountry ?? "").trim();
      const shippingCity = String(req.body?.shippingCity ?? "").trim();
      const shippingAddress = String(req.body?.shippingAddress ?? "").trim();
      const paymentMethod = String(req.body?.paymentMethod ?? "").trim();
      const items = Array.isArray(req.body?.items) ? req.body.items : [];

      if (!customerName || !customerEmail || !shippingCountry || !shippingCity || !shippingAddress) {
        return res.status(400).json({ message: "Customer and shipping fields are required." });
      }
      if (!["stripe", "paypal", "amazon_pay"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Invalid payment method." });
      }
      if (items.length === 0) {
        return res.status(400).json({ message: "At least one cart item is required." });
      }

      const order = await createShopOrder({
        customerName,
        customerEmail,
        shippingCountry,
        shippingCity,
        shippingAddress,
        paymentMethod: paymentMethod as "stripe" | "paypal" | "amazon_pay",
        items: items.map((item: any) => ({
          productId: Number(item?.productId),
          quantity: Number(item?.quantity),
        })),
      });
      return res.status(201).json({ order });
    } catch (error: any) {
      const message = String(error?.message ?? "Unable to create order.");
      return res.status(400).json({ message });
    }
  });

  app.get("/api/shop/orders/:orderRef", async (req, res) => {
    try {
      const orderRef = String(req.params.orderRef ?? "").trim();
      const order = await getShopOrderByRef(orderRef);
      if (!order) return res.status(404).json({ message: "Order not found." });
      return res.json({ order });
    } catch {
      return res.status(500).json({ message: "Unable to load order." });
    }
  });

  app.post("/api/shop/orders/:orderRef/confirm-payment", async (req, res) => {
    try {
      const orderRef = String(req.params.orderRef ?? "").trim();
      const paymentReference = String(req.body?.paymentReference ?? "").trim();
      const updated = await confirmShopOrderPayment(orderRef, paymentReference);
      if (!updated) return res.status(404).json({ message: "Order not found." });
      return res.json({ order: updated });
    } catch {
      return res.status(500).json({ message: "Unable to confirm payment." });
    }
  });

  app.post("/api/onesa/chat", async (req, res) => {
    try {
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const requestedLanguage = typeof req.body?.language === "string" ? req.body.language : undefined;
      // Keep request payload bounded to control prompt size and provider cost.
      const messages: ChatMessage[] = rawMessages
        .map((m: any) => ({
          role: m?.role,
          content: typeof m?.content === "string" ? m.content.trim() : "",
        }))
        .filter((m: ChatMessage) => (m.role === "user" || m.role === "assistant" || m.role === "system") && m.content.length > 0)
        .slice(-20);

      if (messages.length === 0) {
        return res.status(400).json({ message: "At least one user message is required." });
      }

      const reply = await generateOnesaReply(messages, requestedLanguage);
      if (!reply) {
        return res.status(502).json({ message: "Onesa model returned an empty response." });
      }
      lastOnesaSuccessAt = Date.now();
      onesaReadinessCache = null;
      return res.json({ reply });
    } catch (error: any) {
      const upstreamStatus = getUpstreamStatus(error);
      const retryAfterMs = getRetryAfterMs(error) ?? getGlobalBackoffRemainingMs();
      // Surface throttling explicitly so clients can implement countdown/retry UX.
      if (upstreamStatus === 429 || isRateLimitedUpstreamError(error)) {
        return res.status(429).json({
          message: "Onesa is receiving too many requests right now. Please try again shortly.",
          retryAfterMs: retryAfterMs > 0 ? retryAfterMs : undefined,
        });
      }
      if (upstreamStatus === 503 || upstreamStatus === 504) {
        return res.status(503).json({
          message: "Onesa provider is temporarily unavailable. Please try again shortly.",
        });
      }
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        return res.status(503).json({
          message: "Onesa provider is temporarily unavailable. Please try again shortly.",
        });
      }
      const upstream = String(error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? "").trim();
      console.error("[onesa/chat] request failed", { upstreamStatus, upstream });
      return res.status(500).json({
        message: "Onesa chat request failed.",
      });
    }
  });

  app.get("/api/onesa/health", async (_req, res) => {
    const health = await getOnesaHealth();
    const status = health.ok ? 200 : 503;
    return res.status(status).json(health);
  });

  app.get("/api/onesa/ready", async (_req, res) => {
    // Readiness may probe upstream providers; avoid using this for high-frequency keepalive.
    const readiness = await getOnesaReadiness();
    const status = readiness.ready ? 200 : 503;
    return res.status(status).json(readiness);
  });

  // Lightweight keepalive endpoint that does not call upstream AI providers.
  app.get("/api/ping", (_req, res) => {
    return res.json({
      ok: true,
      service: "zigd-platform",
      uptimeSeconds: Math.floor(process.uptime()),
      startedAt: new Date(SERVER_STARTED_AT).toISOString(),
      now: new Date().toISOString(),
    });
  });

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const parsePort = (value: unknown): number | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const port = Math.floor(parsed);
    if (port <= 0 || port > 65535) return null;
    return port;
  };

  const envMode = String(process.env.NODE_ENV ?? "development").toLowerCase();
  const isProduction = envMode === "production";
  const isTest = envMode === "test";
  const requestedPort =
    (isProduction
      ? parsePort(process.env.PORT) ?? parsePort(process.env.PROD_PORT) ?? 3000
      : isTest
        ? parsePort(process.env.TEST_PORT) ?? parsePort(process.env.PORT) ?? 5002
        : parsePort(process.env.DEV_PORT) ?? parsePort(process.env.PORT) ?? 5001);
  const allowPortFallback =
    String(process.env.ALLOW_PORT_FALLBACK ?? "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";

  const listenWithFallback = async (startPort: number, maxAttempts = 20): Promise<number> => {
    let attempt = 0;
    let candidate = startPort;

    while (attempt < maxAttempts) {
      try {
        await new Promise<void>((resolve, reject) => {
          const onError = (error: NodeJS.ErrnoException) => {
            server.off("listening", onListening);
            reject(error);
          };
          const onListening = () => {
            server.off("error", onError);
            resolve();
          };

          server.once("error", onError);
          server.once("listening", onListening);
          server.listen(candidate);
        });
        return candidate;
      } catch (error: any) {
        if (error?.code !== "EADDRINUSE") {
          throw error;
        }
        candidate += 1;
        attempt += 1;
      }
    }

    throw new Error(`No open port found starting from ${startPort} after ${maxAttempts} attempts.`);
  };

  let activePort = requestedPort;
  if (allowPortFallback) {
    activePort = await listenWithFallback(requestedPort);
  } else {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: NodeJS.ErrnoException) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(requestedPort);
    });
  }
  if (activePort !== requestedPort) {
    console.warn(`[server] Port ${requestedPort} is in use. Switched to ${activePort}.`);
  }
  console.log(`Server running on http://localhost:${activePort}/`);
}

startServer().catch(console.error);
