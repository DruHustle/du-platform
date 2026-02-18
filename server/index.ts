import axios from "axios";
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
  getNtirEntities,
  getSession,
  getSuccessStories,
  initializeDatabase,
  searchNtirEntities,
  updateNtirEntity,
  updateUserPassword,
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
const ONESA_READINESS_CACHE_MS = 30000;
const ONESA_READINESS_GRACE_MS = 120000;

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

function detectThanksLanguage(content: string): SupportedOnesaLanguage | null {
  const phrase = normalizeSmallTalkPhrase(content);
  if (!phrase) return null;

  const thanksByLanguage: Record<SupportedOnesaLanguage, Set<string>> = {
    en: new Set([
      "thanks",
      "thank you",
      "thankyou",
      "much appreciated",
    ]),
    sn: new Set([
      "ndatenda",
      "mazvita",
    ]),
    nd: new Set([
      "ngiyabonga",
      "ngiyathokoza",
    ]),
    de: new Set([
      "danke",
      "danke schon",
      "vielen dank",
    ]),
  };

  for (const language of Object.keys(thanksByLanguage) as SupportedOnesaLanguage[]) {
    if (thanksByLanguage[language].has(phrase)) return language;
  }
  return null;
}

function getSmallTalkReply(content: string, defaultLanguage: SupportedOnesaLanguage): string | null {
  const normalized = content.trim().toLowerCase();
  const greetingLanguage = detectGreetingLanguage(normalized);
  if (greetingLanguage) {
    const language = greetingLanguage ?? defaultLanguage;
    if (language === "sn") return "Mhoro! Ndini Onesa. Ndingakubatsirei nhasi?";
    if (language === "nd") return "Sawubona! Ngingu Onesa. Ngingakuncedisa ngani lamuhla?";
    if (language === "de") return "Hallo! Ich bin Onesa. Wie kann ich dir heute helfen?";
    return "Hi! I am Onesa. How can I help you today?";
  }
  const thanksLanguage = detectThanksLanguage(normalized);
  if (thanksLanguage) {
    const language = thanksLanguage ?? defaultLanguage;
    if (language === "sn") return "Ndinotenda. Kana uchida, ndinogona kubatsira nezvekushanya, kudyara mari, kutengeserana, kana kudzokera kumusha.";
    if (language === "nd") return "Wamukelekile. Nxa ufuna, ngingakuncedisa ngezokuvakasha, ukutshala imali, ukuhweba, loba ukubuyela ekhaya.";
    if (language === "de") return "Gern geschehen. Wenn du möchtest, helfe ich bei Tourismus, Investitionen, Handel oder Rückkehrplanung.";
    return "You are welcome. If you want, I can help with tourism, investment, trade, or relocation questions.";
  }
  return null;
}

function getOnesaConfig() {
  const provider = (process.env.ONESA_PROVIDER ?? "ollama").toLowerCase();
  const model = process.env.ONESA_MODEL ?? "llama3.1:8b";
  const fallbackModel = process.env.ONESA_FALLBACK_MODEL ?? "llama3.1:8b";
  const ollamaBase = (process.env.ONESA_OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
  const openaiBase = (process.env.ONESA_AI_BASE_URL ?? "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
  const timeoutRaw = Number(process.env.ONESA_REQUEST_TIMEOUT_MS ?? "180000");
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 180000;
  const maxTokensRaw = Number(process.env.ONESA_MAX_TOKENS ?? "220");
  const maxTokens = Number.isFinite(maxTokensRaw) && maxTokensRaw > 0 ? Math.floor(maxTokensRaw) : 220;
  return { provider, model, fallbackModel, ollamaBase, openaiBase, timeoutMs, maxTokens };
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

async function generateOnesaReply(messages: ChatMessage[], requestedLanguage?: string) {
  const { provider, model, fallbackModel, ollamaBase, openaiBase, timeoutMs, maxTokens } = getOnesaConfig();
  const systemPrompt = process.env.ONESA_SYSTEM_PROMPT ?? DEFAULT_ONESA_SYSTEM_PROMPT;
  const responseLanguage = normalizeOnesaLanguage(requestedLanguage);
  const languageInstruction = [
    `Default reply language for this chat is ${getOnesaLanguageLabel(responseLanguage)}.`,
    "If the user's latest message is clearly in another language, respond in that language.",
    "If the user switches language, switch with them.",
    "Do not translate unless the user asks for translation.",
  ].join(" ");
  const safeFallbackReply = "I am having trouble generating a reliable response right now. Please try again.";
  const latestUserMessage = getLatestUserMessage(messages);
  const smallTalkReply = latestUserMessage ? getSmallTalkReply(latestUserMessage, responseLanguage) : null;
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
    const apiKey = process.env.ONESA_AI_API_KEY ?? "not-required";
    const response = await axios.post(
      `${openaiBase}/chat/completions`,
      {
        model,
        messages: normalizedMessages,
        temperature: 0.3,
        max_tokens: maxTokens,
      },
      {
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    const reply = String(response.data?.choices?.[0]?.message?.content ?? "").trim();
    if (reply && !isLowQualityOnesaReply(reply)) {
      lastOnesaSuccessAt = Date.now();
      return reply;
    }
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
  const { provider, model, ollamaBase, openaiBase } = getOnesaConfig();
  if (provider === "openai_compatible") {
    const apiKey = process.env.ONESA_AI_API_KEY ?? "";
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
      return {
        ok: false,
        provider,
        model,
        endpoint: openaiBase,
        message: "Cloud AI API key is missing.",
      };
    }

    try {
      await axios.get(`${openaiBase}/models`, {
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });
      return { ok: true, provider, model, endpoint: openaiBase };
    } catch (error: any) {
      const status = Number(error?.response?.status ?? 0);
      if (status === 404 || status === 405) {
        // Some OpenAI-compatible providers may not expose /models.
        return { ok: true, provider, model, endpoint: openaiBase };
      }
      return {
        ok: false,
        provider,
        model,
        endpoint: openaiBase,
        message: `OpenAI-compatible endpoint unreachable: ${String(error?.message ?? "unknown error")}`,
      };
    }
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
  const { provider, model, ollamaBase, openaiBase, timeoutMs } = getOnesaConfig();
  const endpoint = provider === "openai_compatible" ? openaiBase : ollamaBase;
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

  try {
    if (provider === "openai_compatible") {
      const apiKey = process.env.ONESA_AI_API_KEY ?? "not-required";
      const response = await axios.post(
        `${openaiBase}/chat/completions`,
        {
          model,
          messages: [{ role: "user", content: "ready" }],
          temperature: 0,
          max_tokens: 4,
        },
        {
          timeout: probeTimeout,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      const reply = String(response.data?.choices?.[0]?.message?.content ?? "").trim();
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
        message: ready ? undefined : "Onesa is unavailable.",
      });
    }

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

  app.use(express.json());
  try {
    await initializeDatabase();
  } catch (error) {
    console.warn("[db] Database initialization failed. Continuing with in-memory fallback mode.");
    console.warn(error);
  }

  app.get("/api/economic-stats", (_req, res) => {
    res.json({
      remittances: 1500,
      gdp: 28000,
      diasporaPopulation: 3000000,
      exportValue: 4500,
      growthRate: 5.3,
      sectorData: [
        { name: "Mining", growth: 8.2 },
        { name: "Agriculture", growth: 4.5 },
        { name: "Tourism", growth: 6.1 },
        { name: "Manufacturing", growth: 3.2 },
      ],
      remittanceImpact: [
        { sector: "Education", percentage: 35 },
        { sector: "Real Estate", percentage: 25 },
        { sector: "Healthcare", percentage: 20 },
        { sector: "Small Business", percentage: 20 },
      ],
    });
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
        { title: "Export Hub", href: "/export-hub", category: "Trade", tags: ["export", "germany", "market", "trade"] },
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

  app.get("/api/ntir/search", async (req, res) => {
    const query = String(req.query.q ?? "");
    try {
      const results = await searchNtirEntities(query);
      return res.json({ query, count: results.length, results });
    } catch {
      return res.status(500).json({ message: "Unable to search NTIR database." });
    }
  });

  app.post("/api/onesa/chat", async (req, res) => {
    try {
      const rawMessages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      const requestedLanguage = typeof req.body?.language === "string" ? req.body.language : undefined;
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
      const isDev = (process.env.NODE_ENV ?? "development") !== "production";
      const upstream = String(error?.response?.data?.error ?? error?.response?.data?.message ?? "").trim();
      const detail = upstream ? ` ${upstream}` : error?.message ? ` ${String(error.message)}` : "";
      return res.status(500).json({
        message: isDev ? `Onesa chat request failed.${detail}` : "Onesa chat request failed.",
      });
    }
  });

  app.get("/api/onesa/health", async (_req, res) => {
    const health = await getOnesaHealth();
    const status = health.ok ? 200 : 503;
    return res.status(status).json(health);
  });

  app.get("/api/onesa/ready", async (_req, res) => {
    const readiness = await getOnesaReadiness();
    const status = readiness.ready ? 200 : 503;
    return res.status(status).json(readiness);
  });

  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const defaultPort = process.env.NODE_ENV === "production" ? 3000 : 5000;
  const requestedPort = Number(process.env.PORT || defaultPort);

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

  const activePort = await listenWithFallback(requestedPort);
  if (activePort !== requestedPort) {
    console.warn(`[server] Port ${requestedPort} is in use. Switched to ${activePort}.`);
  }
  console.log(`Server running on http://localhost:${activePort}/`);
}

startServer().catch(console.error);
