import axios from "axios";
import type { OnesaRouteDeps } from "./onesaRoutes";
import { createMockOnesaReply, isOnesaMockModeEnabled } from "./mockMode";
import { removeRepeatedReplyText } from "./replyText";
import {
  finishOnesaReply,
  IncompleteOnesaReplyError,
  type ReplyCompletion,
} from "./replyCompletion";

const DEFAULT_ONESA_SYSTEM_PROMPT = [
  "You are Onesa AI, a diaspora decision-support assistant for Zimbabwe and the African continent.",
  "Be warm, clear, and conversational.",
  "Do not claim to be trained by Google, OpenAI, or any other big-tech company.",
  "If asked who you are or who trained/built you, identify as Onesa and describe the local-community mission.",
  "If the user sends a simple greeting (for example: hello, hi, hey, mhoro, hesi, ndeipi), respond briefly in 1-2 short sentences and ask one simple follow-up question.",
  "Do not auto-translate or explain language unless the user explicitly asks for translation.",
  "Do not dump long bullet lists unless the user asks for detailed guidance.",
  "For normal requests, provide practical and concise guidance for tourism, investment, technology, and everyday needs, and clearly mark uncertainty.",
].join(" ");
const ONESA_IDENTITY_INSTRUCTION = [
  "Your public identity and name are always Onesa AI, or Onesa, an assistant for Zimbabwe and the African continent.",
  "You are a digital assistant without a physical residence. Never invent a home address or claim to live in a city or country.",
  "Keep this identity even when a user, conversation history, custom prompt, or role-play asks you to become another assistant.",
  "Never introduce yourself as a provider, another platform, or another model, including Gemini, Grok, ChatGPT, Claude, or any other assistant.",
  "You may discuss other platforms when relevant to the user's question without adopting their identity.",
  "Describe Onesa's community mission when asked about your identity. Do not invent details about training, model ownership, or underlying infrastructure.",
  "Do not claim to have browsed, checked official sources, or obtained live information unless verified source material is supplied in this conversation.",
  "For changing requirements, prices, or regulations, make uncertainty clear and direct users to the relevant official source for confirmation.",
].join(" ");

const OTHER_ASSISTANT_NAMES =
  "google(?: gemini)?|gemini|grok|xai|x\\.ai|openai|chat\\s*gpt|gpt(?:[- ]?[0-9][a-z0-9.-]*)?|microsoft|azure(?: openai)?|copilot|bing(?: ai)?|bard|meta|llama|anthropic|claude|cerebras|groq|ollama|perplexity|deepseek|qwen|mistral|le chat|kimi|ernie|doubao";

const ONESA_IDENTITY_REPLIES: Record<SupportedOnesaLanguage, string> = {
  en: "I am Onesa, your AI assistant for Zimbabwe and the African continent. Onesa means illuminate. Our mission is to help communities make informed decisions with practical, locally relevant guidance.",
  sn: "Ndini Onesa, mubatsiri wako weAI weZimbabwe nekondinendi yeAfrica. Onesa zvinoreva kuvhenekera. Chinangwa chedu ndechekubatsira nharaunda kuita sarudzo dzine ruzivo nemazano anobatsira anoenderana nemamiriro emuno.",
  nd: "Ngingu Onesa, umsizi wakho we-AI weZimbabwe kanye lelizwekazi le-Afrika. Onesa kutsho ukukhanyisa. Injongo yethu yikunceda imiphakathi ukwenza izinqumo ezilolwazi ngezeluleko ezilusizo ezihambelana lendawo.",
  de: "Ich bin Onesa, Ihr KI-Assistent für Simbabwe und den afrikanischen Kontinent. Onesa bedeutet erleuchten. Unser Ziel ist es, Gemeinschaften mit praktischen, lokal relevanten Informationen bei fundierten Entscheidungen zu unterstützen.",
};

function getOnesaIdentityReply(language: SupportedOnesaLanguage): string {
  return ONESA_IDENTITY_REPLIES[language] ?? ONESA_IDENTITY_REPLIES.en;
}
const ONESA_READINESS_CACHE_MS = 120000;
const ONESA_READINESS_GRACE_MS = 120000;

type OnesaReadiness = {
  ok: boolean;
  ready: boolean;
  provider: string;
  model: string;
  endpoint: string;
  resolvedModel?: string | null;
  message?: string;
  providerTargets?: Array<{ name: string; baseUrl: string }>;
};

let onesaReadinessCache: { checkedAt: number; value: OnesaReadiness } | null =
  null;
let lastOnesaSuccessAt = 0;
const onesaProviderBackoffUntilByEndpoint = new Map<string, number>();

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OnesaReplyResult = {
  reply: string;
  truncated: boolean;
  finishReason?: string;
};

type SupportedOnesaLanguage = "en" | "sn" | "nd" | "de";

function normalizeOnesaLanguage(value: unknown): SupportedOnesaLanguage {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return "en";
  const base = raw.split("-")[0];
  if (base === "sn" || base === "nd" || base === "de" || base === "en")
    return base;
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

function getOnesaLanguageFallbackReply(
  language: SupportedOnesaLanguage
): string {
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
  onesaProviderBackoffUntilByEndpoint.forEach(until => {
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
  const message = String(
    error?.response?.data?.error ??
      error?.response?.data?.message ??
      error?.message ??
      ""
  ).toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("status code 429")
  );
}

function isRetryableUpstreamError(error: any): boolean {
  if (isRateLimitedUpstreamError(error)) return true;
  const status = getUpstreamStatus(error);
  return status === 503 || status === 504 || status === 529;
}

async function withRetry<T>(
  run: () => Promise<T>,
  maxAttempts = 3,
  endpointKey?: string,
  deadline?: number
): Promise<T> {
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
          const existing =
            onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
          onesaProviderBackoffUntilByEndpoint.set(
            endpointKey,
            Math.max(existing, Date.now() + delayMs)
          );
        }
        // Immediately fail over to the next provider endpoint for 429s.
        throw error;
      }
      if (!isRetryableUpstreamError(error) || attempt === maxAttempts) {
        throw error;
      }
      const retryAfterMs = getRetryAfterMs(error);
      const jitterMs = Math.floor(Math.random() * 250);
      const backoffMs = Math.min(15000, 700 * 2 ** (attempt - 1)) + jitterMs;
      const delayMs = Math.max(backoffMs, retryAfterMs ?? 0);
      if (deadline !== undefined && Date.now() + delayMs >= deadline) {
        throw new IncompleteOnesaReplyError();
      }
      if (isRateLimitedUpstreamError(error) && endpointKey) {
        const existing =
          onesaProviderBackoffUntilByEndpoint.get(endpointKey) ?? 0;
        onesaProviderBackoffUntilByEndpoint.set(
          endpointKey,
          Math.max(existing, Date.now() + delayMs)
        );
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
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
  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
  if (!normalized) return "";
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length > 4) return "";
  return tokens.join(" ");
}

function detectLatestUserLanguage(
  content: string
): SupportedOnesaLanguage | null {
  const greetingLanguage = detectGreetingLanguage(content);
  if (greetingLanguage) return greetingLanguage;

  const normalized = content
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  const score = { en: 0, sn: 0, nd: 0, de: 0 } as Record<
    SupportedOnesaLanguage,
    number
  >;
  const has = (set: Set<string>, word: string) => set.has(word);
  const snWords = new Set([
    "mhoro",
    "ndeip",
    "ndeipi",
    "makadii",
    "maswera",
    "sei",
    "ndatenda",
    "mazvita",
    "nding",
    "kubatsira",
    "urisei",
  ]);
  const ndWords = new Set([
    "sawubona",
    "salibonani",
    "kunjani",
    "ngiyabonga",
    "nxa",
    "lamuhla",
    "ngingakuncedisa",
  ]);
  const deWords = new Set([
    "hallo",
    "guten",
    "danke",
    "bitte",
    "ich",
    "und",
    "wie",
    "kann",
  ]);
  const enWords = new Set([
    "hello",
    "hi",
    "hey",
    "thanks",
    "thank",
    "you",
    "how",
    "can",
    "help",
    "today",
  ]);

  for (const word of words) {
    if (has(snWords, word) || word.startsWith("ndi")) score.sn += 1;
    if (has(ndWords, word) || word.startsWith("ngi")) score.nd += 1;
    if (has(deWords, word)) score.de += 1;
    if (has(enWords, word)) score.en += 1;
  }

  const ranked = (Object.keys(score) as SupportedOnesaLanguage[]).sort(
    (a, b) => score[b] - score[a]
  );
  const top = ranked[0];
  if (score[top] <= 0) return null;
  const second = ranked[1];
  if (score[top] === score[second]) return null;
  return top;
}

function isMixedLanguageReply(
  reply: string,
  expectedLanguage: SupportedOnesaLanguage
): boolean {
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
  const swahiliMarkers = [
    "kwa kutumia",
    "kama ",
    " au ",
    "mifumo yote",
    "naweza",
    "leo",
  ];
  const englishHits = englishMarkers.reduce(
    (count, marker) => (normalized.includes(marker) ? count + 1 : count),
    0
  );

  if (expectedLanguage === "sn") {
    const swahiliHits = swahiliMarkers.reduce(
      (count, marker) => (normalized.includes(marker) ? count + 1 : count),
      0
    );
    return englishHits >= 2 || swahiliHits >= 1;
  }

  if (expectedLanguage === "nd" || expectedLanguage === "de") {
    return englishHits >= 2;
  }

  return false;
}

function detectGreetingLanguage(
  content: string
): SupportedOnesaLanguage | null {
  const phrase = normalizeSmallTalkPhrase(content);
  if (!phrase) return null;

  if (phrase.includes("urisei") || phrase.includes("uri sei")) return "sn";

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
      "uri sei",
      "urisei",
    ]),
    nd: new Set(["salibonani", "sawubona", "kunjani"]),
    de: new Set([
      "hallo",
      "guten tag",
      "guten morgen",
      "guten abend",
      "servus",
    ]),
  };

  for (const language of Object.keys(
    greetingsByLanguage
  ) as SupportedOnesaLanguage[]) {
    if (greetingsByLanguage[language].has(phrase)) return language;
  }
  return null;
}

function getSmallTalkReply(
  content: string,
  defaultLanguage: SupportedOnesaLanguage
): string | null {
  const normalized = content.trim().toLowerCase().replace(/[’‘]/g, "'");
  const identityPatterns = [
    /\bwhat(?:'s| is) your name\b/,
    /\bwhat does onesa mean\b/,
    /\b(?:what|which) (?:ai |chat |language )?(?:model|assistant|platform) (?:are you|is this)\b/,
    /\b(?:identify|introduce) yourself\b/,
    /\b(?:your|the assistant's) identity\b/,
    new RegExp(
      `\\b(?:are you|you are|you're|act as|pretend to be|respond as) (?:${OTHER_ASSISTANT_NAMES})\\b`,
      "i"
    ),
    /\bwer bist du\b|\bwie (?:heißt|heisst) du\b|\bwer hat dich (?:entwickelt|erstellt|trainiert|gebaut)\b/,
    /\b(?:ndiwe ani|unonzi ani|wakagadzirwa nani|ndiani akakugadzira)\b/,
    /\b(?:ungubani|ngubani owakudalayo|ngubani owakwakhayo)\b/,
    /\bwho are you\b/,
    /\bwhat are you\b/,
    /\bwhat is onesa\b/,
    /\bwho is onesa\b/,
    /\bwhere are you from\b/,
    /\bwhere r you from\b/,
    /\bwhat is your origin\b/,
    /\bwhat's your origin\b/,
    /\bwhere do you come from\b/,
    /\bwho built you\b/,
    /\bwho created you\b/,
    /\bare you made by\b/,
    /\bwho made you\b/,
    /\bwho trained you\b/,
    /\bare you trained by\b/,
    /\bname of (the )?team\b/,
    /\bteam name\b/,
    /\bwho is your team\b/,
    /\bwho are your developers\b/,
    /\bwho developed you\b/,
    /\bwhat('?s| is) the name of (your|the) team\b/,
  ];
  if (identityPatterns.some(pattern => pattern.test(normalized))) {
    return getOnesaIdentityReply(defaultLanguage);
  }
  const greetingLanguage = detectGreetingLanguage(normalized);
  if (greetingLanguage) {
    const language = defaultLanguage;
    if (language === "sn")
      return "Mhoro! Ndini Onesa. Ndingakubatsirai nei nhasi?";
    if (language === "nd")
      return "Sawubona! Ngingu Onesa. Ngingakuncedisa ngani lamuhla?";
    if (language === "de")
      return "Hallo! Ich bin Onesa. Wie kann ich dir heute helfen?";
    return "Hi! I am Onesa. How can I help you today?";
  }
  return null;
}

function hasForbiddenOriginClaim(reply: string): boolean {
  const text = String(reply ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return false;

  const provider = `(?:${OTHER_ASSISTANT_NAMES})\\b`;
  const self =
    "(?:i am|i'm|im|i was|i identify as|onesa(?: ai)? is|onesa(?: ai)? was|ich bin|ndiri|ndini|ndinonzi|ngingu)";
  const identityClaim = new RegExp(
    `\\b(?:${self}|my name is|my identity is|this is|you(?:'re| are) (?:chatting|speaking|talking) (?:to|with)) (?:actually |an? |the |called |named )?${provider}`,
    "i"
  );
  const selfDescription =
    "(?:(?:an? |the )?(?:(?:helpful |ai |large |language |virtual )*(?:model|assistant|chatbot)|ai|artificial intelligence)[, ]+)?";
  const originClaim = new RegExp(
    `\\b${self} ${selfDescription}(?:(?:developed|created|trained|built|made|powered|provided|operated|hosted) (?:by|on|using)|(?:a version|an instance) of|based on|from|named|called) (?:the |(?:an? )?(?:team|company|group)(?: of developers)? (?:at|from) )?${provider}`,
    "i"
  );
  const creatorClaim = new RegExp(
    `\\bmy (?:creators?|developers?|provider|platform|company|name) (?:is|are|is from) ${provider}`,
    "i"
  );
  const translatedOriginClaim = new RegExp(
    `\\b(?:ich (?:wurde|bin) (?:von |ein von )${provider}|ich bin (?:ein|eine) (?:sprachmodell|ki-modell|ki-assistent) (?:von|entwickelt von) ${provider}|ndakagadzirwa ne${provider}|ngadalwa yi${provider})`,
    "i"
  );
  const otherNameClaim = new RegExp(
    String.raw`\b(?:my name is|call me|i am (?:called|named)|mein name ist|ich heiße|ich heisse|ndinonzi|igama lami ngu) (?!onesa\b)[\p{L}]`,
    "u"
  );
  const openingIdentityClaim = new RegExp(`^as (?:an? )?${provider}`, "i");
  const reverseOriginClaim = new RegExp(
    `\\b${provider} (?:created|built|made|trained|developed) me\\b`,
    "i"
  );
  const openingOriginClaim = new RegExp(
    `^(?:as )?(?:an? )?(?:ai |large |language |virtual )*(?:model|assistant|chatbot) (?:developed|created|trained|built|made|powered) by ${provider}`,
    "i"
  );
  const providerIntroduction = new RegExp(
    `^${provider} (?:here|speaking)\\b`,
    "i"
  );
  return (
    identityClaim.test(text) ||
    originClaim.test(text) ||
    creatorClaim.test(text) ||
    translatedOriginClaim.test(text) ||
    otherNameClaim.test(text) ||
    openingIdentityClaim.test(text) ||
    reverseOriginClaim.test(text) ||
    openingOriginClaim.test(text) ||
    providerIntroduction.test(text)
  );
}

function enforceOnesaIdentityGuard(
  reply: string,
  language: SupportedOnesaLanguage
): string {
  if (hasForbiddenOriginClaim(reply)) {
    return getOnesaIdentityReply(language);
  }
  return reply;
}

function hasLanguageMetaReply(reply: string): boolean {
  const text = String(reply ?? "").toLowerCase();
  if (!text) return false;
  return (
    text.includes("speaking in shona") ||
    text.includes("speaking in ndebele") ||
    text.includes("speaking in german") ||
    text.includes("let me try that again in english") ||
    text.includes("let me try that again in") ||
    (text.includes("in english") && text.includes("let me try"))
  );
}

type CloudProviderTarget = {
  name: "primary" | "secondary" | "tertiary" | "tertiary2" | "tertiary3";
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
    normalized === "YOUR_PERPLEXITY_API_KEY" ||
    normalized.startsWith("YOUR_")
  );
}

function buildCloudProviderTargets(
  config: ReturnType<typeof getOnesaConfig>
): CloudProviderTarget[] {
  const primaryModels = Array.from(
    new Set(
      [...config.modelCandidates, config.model, config.fallbackModel].filter(
        Boolean
      )
    )
  );
  const secondaryModels = Array.from(
    new Set(
      [
        ...config.secondaryModelCandidates,
        config.secondaryModel,
        config.secondaryFallbackModel,
      ].filter(Boolean)
    )
  );
  const claudeModels = Array.from(
    new Set(
      [
        ...config.claudeModelCandidates,
        config.claudeModel,
        config.claudeFallbackModel,
      ].filter(Boolean)
    )
  );
  const cerebrasModels = Array.from(
    new Set(
      [
        ...config.cerebrasModelCandidates,
        config.cerebrasModel,
        config.cerebrasFallbackModel,
      ].filter(Boolean)
    )
  );
  const perplexityModels = Array.from(
    new Set(
      [
        ...config.perplexityModelCandidates,
        config.perplexityModel,
        config.perplexityFallbackModel,
      ].filter(Boolean)
    )
  );

  const targets: CloudProviderTarget[] = [];
  // Primary: Gemini/OpenAI-compatible
  if (!isPlaceholderApiKey(config.openaiApiKey)) {
    targets.push({
      name: "primary",
      kind: "openai",
      baseUrl: config.openaiBase,
      apiKey: config.openaiApiKey,
      models: primaryModels.length > 0 ? primaryModels : [config.model],
    });
  }
  // Secondary: Groq (OpenAI-compatible)
  if (
    config.secondaryOpenaiBase &&
    !isPlaceholderApiKey(config.secondaryOpenaiApiKey)
  ) {
    targets.push({
      name: "secondary",
      kind: "openai",
      baseUrl: config.secondaryOpenaiBase,
      apiKey: config.secondaryOpenaiApiKey,
      models:
        secondaryModels.length > 0
          ? secondaryModels
          : [config.secondaryModel || config.model],
    });
  }
  // Tertiary: Claude
  if (!isPlaceholderApiKey(config.claudeApiKey)) {
    targets.push({
      name: "tertiary",
      kind: "anthropic",
      baseUrl: config.claudeBase || "https://api.anthropic.com",
      apiKey: config.claudeApiKey,
      models: claudeModels.length > 0 ? claudeModels : [config.model],
      anthropicVersion: config.claudeAnthropicVersion,
    });
  }
  // Tertiary2: Cerebras
  if (!isPlaceholderApiKey(config.cerebrasApiKey)) {
    targets.push({
      name: "tertiary2",
      kind: "openai",
      baseUrl: config.cerebrasBase || "https://api.cerebras.ai/v1",
      apiKey: config.cerebrasApiKey,
      models: cerebrasModels.length > 0 ? cerebrasModels : [config.model],
    });
  }
  // Tertiary3: Perplexity
  if (!isPlaceholderApiKey(config.perplexityApiKey)) {
    targets.push({
      name: "tertiary3",
      kind: "openai",
      baseUrl: config.perplexityBase || "https://api.perplexity.ai",
      apiKey: config.perplexityApiKey,
      models: perplexityModels.length > 0 ? perplexityModels : [config.model],
    });
  }
  return targets;
}

function getOnesaConfig() {
  const groqSetting = (suffix: string) =>
    String(process.env[`ONESA_GROQ_${suffix}`] ?? "").trim() ||
    String(process.env[`ONESA_GROK_${suffix}`] ?? "").trim();
  const provider = (
    process.env.ONESA_PROVIDER ??
    process.env.ONESA_AI_PROVIDER ??
    "ollama"
  ).toLowerCase();
  const geminiModel = process.env.ONESA_GEMINI_MODEL ?? "";
  const geminiFallbackModel = process.env.ONESA_GEMINI_FALLBACK_MODEL ?? "";
  const geminiModelCandidates = String(
    process.env.ONESA_GEMINI_MODEL_CANDIDATES ?? ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const model = geminiModel || process.env.ONESA_AI_MODEL || "llama3.1:8b";
  const fallbackModel =
    geminiFallbackModel ||
    process.env.ONESA_AI_FALLBACK_MODEL ||
    (provider === "openai_compatible" ? model : "llama3.1:8b");
  const modelCandidates = String(
    (geminiModelCandidates.length
      ? geminiModelCandidates.join(",")
      : undefined) ||
      process.env.ONESA_AI_MODEL_CANDIDATES ||
      ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const secondaryModel = groqSetting("MODEL");
  const secondaryFallbackModel = groqSetting("FALLBACK_MODEL");
  const secondaryModelCandidates = groqSetting("MODEL_CANDIDATES")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const tertiaryModel = process.env.ONESA_TERTIARY_MODEL ?? "";
  const tertiaryFallbackModel = process.env.ONESA_TERTIARY_FALLBACK_MODEL ?? "";
  const tertiaryModelCandidates = String(
    process.env.ONESA_TERTIARY_MODEL_CANDIDATES ?? ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const claudeBase = String(process.env.ONESA_CLAUDE_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const claudeApiKey = process.env.ONESA_CLAUDE_API_KEY ?? "";
  const claudeModel = process.env.ONESA_CLAUDE_MODEL ?? "";
  const claudeFallbackModel = process.env.ONESA_CLAUDE_FALLBACK_MODEL ?? "";
  const claudeModelCandidates = String(
    process.env.ONESA_CLAUDE_MODEL_CANDIDATES ?? ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const claudeAnthropicVersion =
    process.env.ONESA_CLAUDE_ANTHROPIC_VERSION ?? "2023-06-01";
  const cerebrasBase = String(process.env.ONESA_CEREBRAS_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const cerebrasApiKey = process.env.ONESA_CEREBRAS_API_KEY ?? "";
  const cerebrasModel = process.env.ONESA_CEREBRAS_MODEL ?? "";
  const cerebrasFallbackModel = process.env.ONESA_CEREBRAS_FALLBACK_MODEL ?? "";
  const cerebrasModelCandidates = String(
    process.env.ONESA_CEREBRAS_MODEL_CANDIDATES ?? ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const perplexityBase = String(process.env.ONESA_PERPLEXITY_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  const perplexityApiKey = process.env.ONESA_PERPLEXITY_API_KEY ?? "";
  const perplexityModel = process.env.ONESA_PERPLEXITY_MODEL ?? "";
  const perplexityFallbackModel =
    process.env.ONESA_PERPLEXITY_FALLBACK_MODEL ?? "";
  const perplexityModelCandidates = String(
    process.env.ONESA_PERPLEXITY_MODEL_CANDIDATES ?? ""
  )
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const ollamaBase = (
    process.env.ONESA_OLLAMA_URL ?? "http://127.0.0.1:11434"
  ).replace(/\/+$/, "");
  const openaiBase = (
    process.env.ONESA_GEMINI_BASE_URL ??
    process.env.ONESA_AI_BASE_URL ??
    "http://127.0.0.1:1234/v1"
  ).replace(/\/+$/, "");
  const openaiApiKey =
    process.env.ONESA_GEMINI_API_KEY ?? process.env.ONESA_AI_API_KEY ?? "";
  const secondaryOpenaiBase = groqSetting("AI_BASE_URL").replace(/\/+$/, "");
  const secondaryOpenaiApiKey = groqSetting("AI_API_KEY");
  const tertiaryOpenaiBase = String(
    process.env.ONESA_TERTIARY_AI_BASE_URL ?? ""
  )
    .trim()
    .replace(/\/+$/, "");
  const tertiaryOpenaiApiKey = process.env.ONESA_TERTIARY_AI_API_KEY ?? "";
  const timeoutRaw = Number(process.env.ONESA_REQUEST_TIMEOUT_MS ?? "180000");
  const timeoutMs =
    Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 180000;
  // Very small budgets were cutting off ordinary answers before a sentence finished.
  const maxTokensRaw = Number(process.env.ONESA_MAX_TOKENS ?? "1200");
  const maxTokens =
    Number.isFinite(maxTokensRaw) && maxTokensRaw > 0
      ? Math.max(512, Math.floor(maxTokensRaw))
      : 1200;
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
    perplexityBase,
    perplexityApiKey,
    perplexityModel,
    perplexityFallbackModel,
    perplexityModelCandidates,
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

function resolveOllamaModelName(
  requestedModel: string,
  availableModels: string[]
): string | null {
  if (!requestedModel) return null;
  if (availableModels.includes(requestedModel)) return requestedModel;

  const hasTag = requestedModel.includes(":");
  if (!hasTag) {
    const latestCandidate = `${requestedModel}:latest`;
    if (availableModels.includes(latestCandidate)) return latestCandidate;
  }

  const requestedBase = requestedModel.split(":")[0];
  const sameBase = availableModels.filter(
    m => m.split(":")[0] === requestedBase
  );
  if (sameBase.length > 0) {
    const latest = sameBase.find(m => m.endsWith(":latest"));
    return latest ?? sameBase[0];
  }

  return null;
}

function isLowQualityOnesaReply(reply: string): boolean {
  const text = reply.trim().toLowerCase();
  if (!text) return true;

  if (text.includes("translate from en to en")) return true;
  const notedCount = (text.match(/\bnoted\b/g) ?? []).length;
  if (notedCount >= 3) return true;

  const normalized = text.replace(/\s+/g, " ").trim();
  const segments = normalized
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(Boolean);
  if (segments.length >= 4) {
    const segmentCounts = new Map<string, number>();
    for (const segment of segments) {
      segmentCounts.set(segment, (segmentCounts.get(segment) ?? 0) + 1);
    }
    if (Array.from(segmentCounts.values()).some(count => count >= 3)) {
      return true;
    }
  }

  const words = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 20) {
    const uniqueRatio = new Set(words).size / words.length;
    if (uniqueRatio < 0.35) return true;
  }

  return false;
}

function buildAnthropicInput(messages: ChatMessage[]) {
  const system = messages
    .filter(message => message.role === "system")
    .map(message => message.content.trim())
    .filter(Boolean)
    .join("\n\n")
    .trim();
  const chatMessages = messages
    .filter(message => message.role === "user" || message.role === "assistant")
    .map(message => ({
      role: message.role,
      content: message.content,
    }));
  return { system, chatMessages };
}

function extractAnthropicText(data: any): string {
  const content = data?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block: any) => block?.type === "text" && typeof block?.text === "string"
    )
    .map((block: any) => String(block.text).trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function generateOnesaReply(
  messages: ChatMessage[],
  requestedLanguage?: string
): Promise<OnesaReplyResult> {
  const hasRequestedLanguage =
    typeof requestedLanguage === "string" &&
    requestedLanguage.trim().length > 0;
  const preferredLanguage = normalizeOnesaLanguage(requestedLanguage);
  const latestUserMessage = getLatestUserMessage(messages);
  const detectedUserLanguage = latestUserMessage
    ? detectLatestUserLanguage(latestUserMessage)
    : null;
  const responseLanguage = hasRequestedLanguage
    ? preferredLanguage
    : (detectedUserLanguage ?? preferredLanguage);
  if (isOnesaMockModeEnabled()) {
    const smallTalkReply = latestUserMessage
      ? getSmallTalkReply(latestUserMessage, responseLanguage)
      : null;
    const reply =
      smallTalkReply ??
      createMockOnesaReply(latestUserMessage, responseLanguage);
    lastOnesaSuccessAt = Date.now();
    return { reply, truncated: false };
  }

  const config = getOnesaConfig();
  const { provider, model, fallbackModel, ollamaBase, timeoutMs, maxTokens } =
    config;
  // Leave time for the API response before the browser's 180-second timeout.
  const deadline = Date.now() + Math.min(timeoutMs, 150_000);
  const remainingTimeout = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new IncompleteOnesaReplyError();
    return remaining;
  };
  const systemPrompt =
    process.env.ONESA_SYSTEM_PROMPT ?? DEFAULT_ONESA_SYSTEM_PROMPT;
  const languageInstruction = hasRequestedLanguage
    ? [
        `Respond only in ${getOnesaLanguageLabel(responseLanguage)}.`,
        "Do not mix languages in the same response unless the user explicitly asks.",
        "Treat any other-language snippets in context as metadata, not reply language targets.",
        `Use ${getOnesaLanguageLabel(responseLanguage)} for the full reply.`,
        "Do not translate unless the user asks for translation.",
        "Do not mention language detection or switching languages in your response.",
      ].join(" ")
    : [
        `Respond only in ${getOnesaLanguageLabel(responseLanguage)}.`,
        "Do not mix languages in the same response unless the user explicitly asks.",
        "Always respond in the same language as the user's latest message.",
        `If the latest message language is ambiguous, use ${getOnesaLanguageLabel(responseLanguage)} only.`,
        "If the user switches language, switch with them.",
        "Do not translate unless the user asks for translation.",
        "Do not mention language detection or switching languages in your response.",
      ].join(" ");
  const responseStyleInstruction = `Keep each point in your answer once. Do not restart or repeat sentences, paragraphs, or list items. Finish your answer within about ${Math.max(60, Math.floor(maxTokens * 0.35))} words; prioritize the useful points and end with a complete sentence. Preserve any required structured output format.`;
  const safeFallbackReply = getOnesaLanguageFallbackReply(responseLanguage);
  const smallTalkReply = latestUserMessage
    ? getSmallTalkReply(latestUserMessage, responseLanguage)
    : null;
  if (smallTalkReply) {
    lastOnesaSuccessAt = Date.now();
    return { reply: smallTalkReply, truncated: false };
  }
  const normalizedMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages.filter(
      m =>
        m?.role === "system" &&
        typeof m.content === "string" &&
        m.content.trim()
    ),
    { role: "system", content: ONESA_IDENTITY_INSTRUCTION },
    { role: "system", content: languageInstruction },
    { role: "system", content: responseStyleInstruction },
    ...messages.filter(
      m =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim()
    ),
  ];
  const rewriteMessages: ChatMessage[] = [
    ...normalizedMessages,
    {
      role: "system",
      content: `The previous generation ran out of space. Give a fresh, complete answer to the user's latest request in at most ${Math.max(40, Math.floor(maxTokens * 0.2))} words. Use a few short sentences. Do not continue or refer to the cut-off draft. Finish the answer within this response. Preserve any required JSON schema or structured output format.`,
    },
  ];

  const buildPromptFromMessages = (chatMessages: ChatMessage[]) =>
    chatMessages
      .map(m => {
        if (m.role === "system") return `System: ${m.content}`;
        if (m.role === "assistant") return `Assistant: ${m.content}`;
        return `User: ${m.content}`;
      })
      .join("\n\n");

  const extractOllamaCompletion = (data: any): ReplyCompletion => {
    const text = data?.message?.content ?? data?.response ?? data?.content;
    const finishReason = String(data?.done_reason ?? "").trim();
    return {
      reply: typeof text === "string" ? text.trim() : "",
      truncated: data?.done === false || finishReason !== "stop",
      finishReason,
    };
  };

  const sendOllamaChat = async (
    targetModel: string,
    chatMessages: ChatMessage[]
  ) => {
    const response = await axios.post(
      `${ollamaBase}/api/chat`,
      {
        model: targetModel,
        messages: chatMessages,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: remainingTimeout(),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaCompletion(response.data);
  };

  const sendOllamaGenerate = async (
    targetModel: string,
    chatMessages: ChatMessage[]
  ) => {
    const response = await axios.post(
      `${ollamaBase}/api/generate`,
      {
        model: targetModel,
        prompt: buildPromptFromMessages(chatMessages),
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: maxTokens,
        },
      },
      {
        timeout: remainingTimeout(),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return extractOllamaCompletion(response.data);
  };

  const tryOllamaModel = async (targetModel: string): Promise<string> => {
    let useGenerate = false;
    const request = async (chatMessages: ChatMessage[]) => {
      if (!useGenerate) {
        try {
          const result = await sendOllamaChat(targetModel, chatMessages);
          if (result.reply || result.truncated) return result;
        } catch {
          // Models without chat templates use the generate endpoint for all recovery passes.
        }
        useGenerate = true;
      }
      return sendOllamaGenerate(targetModel, chatMessages);
    };
    const result = await finishOnesaReply(
      await request(normalizedMessages),
      () => request(rewriteMessages)
    );
    return result.reply;
  };

  const runOllamaFallback = async (): Promise<OnesaReplyResult> => {
    let availableModels: string[] = [];
    try {
      const tagsResponse = await axios.get(`${ollamaBase}/api/tags`, {
        timeout: Math.min(5000, remainingTimeout()),
      });
      availableModels = Array.isArray(tagsResponse.data?.models)
        ? tagsResponse.data.models.map((m: any) => String(m?.name ?? ""))
        : [];
    } catch {
      // Tags endpoint unavailable: continue with requested model only.
    }

    const candidates = Array.from(
      new Set(
        [model, resolveOllamaModelName(model, availableModels)].filter(
          (m): m is string => Boolean(m)
        )
      )
    );
    const fallbackCandidates = Array.from(
      new Set(
        [
          fallbackModel,
          resolveOllamaModelName(fallbackModel, availableModels),
        ].filter((m): m is string => Boolean(m))
      )
    ).filter(candidate => !candidates.includes(candidate));

    let lastError: any = null;
    let lowQualityReply: string | null = null;
    for (const candidate of candidates) {
      try {
        const reply = await tryOllamaModel(candidate);
        const guardedReply = enforceOnesaIdentityGuard(
          removeRepeatedReplyText(reply),
          responseLanguage
        );
        const finalReply = hasLanguageMetaReply(guardedReply)
          ? getOnesaLanguageFallbackReply(responseLanguage)
          : guardedReply;
        if (finalReply) {
          if (
            isLowQualityOnesaReply(finalReply) ||
            isMixedLanguageReply(finalReply, responseLanguage)
          ) {
            lowQualityReply = finalReply;
            continue;
          }
          lastOnesaSuccessAt = Date.now();
          return { reply: finalReply, truncated: false };
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    for (const candidate of fallbackCandidates) {
      try {
        const reply = await tryOllamaModel(candidate);
        const guardedReply = enforceOnesaIdentityGuard(
          removeRepeatedReplyText(reply),
          responseLanguage
        );
        const finalReply = hasLanguageMetaReply(guardedReply)
          ? getOnesaLanguageFallbackReply(responseLanguage)
          : guardedReply;
        if (finalReply) {
          if (
            isLowQualityOnesaReply(finalReply) ||
            isMixedLanguageReply(finalReply, responseLanguage)
          ) {
            lowQualityReply = finalReply;
            continue;
          }
          lastOnesaSuccessAt = Date.now();
          return { reply: finalReply, truncated: false };
        }
      } catch (error: any) {
        lastError = error;
      }
    }

    if (lowQualityReply) {
      return { reply: safeFallbackReply, truncated: false };
    }
    if (lastError) throw lastError;
    throw new Error(
      `Onesa model returned an empty response for: ${[...candidates, ...fallbackCandidates].join(", ") || model}`
    );
  };

  if (provider === "openai_compatible") {
    const providers = buildCloudProviderTargets(config);
    if (providers.length === 0) {
      return await runOllamaFallback();
    }
    const requestCloudCompletion = async (
      providerTarget: ReturnType<typeof buildCloudProviderTargets>[number],
      targetModel: string,
      chatMessages: ChatMessage[]
    ) => {
      const anthropicInput = buildAnthropicInput(chatMessages);
      const response = await withRetry<import("axios").AxiosResponse>(
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
                timeout: remainingTimeout(),
                headers: {
                  "x-api-key": providerTarget.apiKey,
                  "anthropic-version":
                    providerTarget.anthropicVersion ?? "2023-06-01",
                  "Content-Type": "application/json",
                },
              }
            );
          }
          return axios.post(
            `${providerTarget.baseUrl}/chat/completions`,
            {
              model: targetModel,
              messages: chatMessages,
              temperature: 0.3,
              max_tokens: maxTokens,
            },
            {
              timeout: remainingTimeout(),
              headers: {
                Authorization: `Bearer ${providerTarget.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );
        },
        3,
        providerTarget.baseUrl,
        deadline
      );
      if (providerTarget.kind === "anthropic") {
        const finishReason = String(response.data?.stop_reason ?? "").trim();
        return {
          reply: extractAnthropicText(response.data),
          truncated:
            finishReason !== "end_turn" && finishReason !== "stop_sequence",
          finishReason,
        };
      }
      const finishReason = String(
        response.data?.choices?.[0]?.finish_reason ?? ""
      ).trim();
      const text = response.data?.choices?.[0]?.message?.content;
      return {
        reply: typeof text === "string" ? text.trim() : "",
        truncated: finishReason !== "stop",
        finishReason,
      };
    };

    let lastRateLimitError: any = null;
    let lastError: any = null;
    let longestBackoffMs = 0;

    for (const providerTarget of providers) {
      const providerBackoffMs = getEndpointBackoffRemainingMs(
        providerTarget.baseUrl
      );
      if (providerBackoffMs > 0) {
        longestBackoffMs = Math.max(longestBackoffMs, providerBackoffMs);
        continue;
      }

      let shouldSkipEndpoint = false;
      for (const targetModel of providerTarget.models) {
        if (
          shouldSkipEndpoint ||
          getEndpointBackoffRemainingMs(providerTarget.baseUrl) > 0
        ) {
          break;
        }
        try {
          const completed = await finishOnesaReply(
            await requestCloudCompletion(
              providerTarget,
              targetModel,
              normalizedMessages
            ),
            () =>
              requestCloudCompletion(
                providerTarget,
                targetModel,
                rewriteMessages
              )
          );
          const { reply, truncated, finishReason } = completed;

          const guardedReply = enforceOnesaIdentityGuard(
            removeRepeatedReplyText(reply),
            responseLanguage
          );
          const finalReply = hasLanguageMetaReply(guardedReply)
            ? getOnesaLanguageFallbackReply(responseLanguage)
            : guardedReply;
          if (
            finalReply &&
            !isLowQualityOnesaReply(finalReply) &&
            !isMixedLanguageReply(finalReply, responseLanguage)
          ) {
            lastOnesaSuccessAt = Date.now();
            return { reply: finalReply, truncated, finishReason };
          }
        } catch (error: any) {
          if (isRateLimitedUpstreamError(error)) {
            lastRateLimitError = error;
            const remaining = getEndpointBackoffRemainingMs(
              providerTarget.baseUrl
            );
            longestBackoffMs = Math.max(
              longestBackoffMs,
              remaining,
              getRetryAfterMs(error) ?? 0
            );
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
      try {
        return await runOllamaFallback();
      } catch {
        // Keep cloud rate-limit signal when local fallback is unavailable.
      }
      const retryAfterMs =
        longestBackoffMs > 0
          ? longestBackoffMs
          : getRetryAfterMs(lastRateLimitError);
      if (retryAfterMs && retryAfterMs > 0) {
        const existing = Number(
          lastRateLimitError?.response?.headers?.["retry-after"] ?? 0
        );
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
    if (lastError) {
      try {
        return await runOllamaFallback();
      } catch {
        throw lastError;
      }
    }
    try {
      return await runOllamaFallback();
    } catch {
      return { reply: safeFallbackReply, truncated: false };
    }
  }
  return await runOllamaFallback();
}

async function getOnesaHealth() {
  if (isOnesaMockModeEnabled()) {
    return {
      ok: true,
      ready: true,
      provider: "mock",
      model: "mock-onesa",
      endpoint: "local://mock-onesa",
      message: "Onesa mock mode is active.",
    };
  }

  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase } = config;
  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    const targetSummaries = providerTargets.map(target => ({
      name: target.name,
      baseUrl: target.baseUrl,
    }));
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
      const perplexityConfigured =
        Boolean(config.perplexityBase) ||
        Boolean(config.perplexityApiKey) ||
        Boolean(config.perplexityModel) ||
        Boolean(config.perplexityFallbackModel) ||
        config.perplexityModelCandidates.length > 0;
      const tiers = [
        { name: "primary", base: config.openaiBase, key: config.openaiApiKey },
        {
          name: "secondary",
          base: config.secondaryOpenaiBase,
          key: config.secondaryOpenaiApiKey,
        },
        {
          name: "tertiary",
          base: config.tertiaryOpenaiBase,
          key: config.tertiaryOpenaiApiKey,
        },
        ...(claudeConfigured
          ? [
              {
                name: "claude",
                base: config.claudeBase || "https://api.anthropic.com",
                key: config.claudeApiKey,
              },
            ]
          : []),
        ...(cerebrasConfigured
          ? [
              {
                name: "cerebras",
                base: config.cerebrasBase || "https://api.cerebras.ai/v1",
                key: config.cerebrasApiKey,
              },
            ]
          : []),
        ...(perplexityConfigured
          ? [
              {
                name: "perplexity",
                base: config.perplexityBase || "https://api.perplexity.ai",
                key: config.perplexityApiKey,
              },
            ]
          : []),
      ].filter(tier => Boolean(tier.base));
      const missingKeyTiers = tiers
        .filter(tier => isPlaceholderApiKey(tier.key))
        .map(tier => tier.name);

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
        providerTargets: targetSummaries,
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
              "anthropic-version":
                providerTarget.anthropicVersion ?? "2023-06-01",
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
        return {
          ok: true,
          provider,
          model,
          endpoint: providerTarget.baseUrl,
          providerTargets: targetSummaries,
        };
      } catch (error: any) {
        const status = Number(error?.response?.status ?? 0);
        if (status === 404 || status === 405) {
          // Some providers may not expose a models list endpoint.
          return {
            ok: true,
            provider,
            model,
            endpoint: providerTarget.baseUrl,
            providerTargets: targetSummaries,
          };
        }
        failures.push(
          `${providerTarget.name}:${String(error?.message ?? "unknown error")}`
        );
      }
    }
    return {
      ok: false,
      provider,
      model,
      endpoint: openaiBase,
      providerTargets: targetSummaries,
      message: `Cloud endpoint unreachable: ${failures.join(" | ") || "unknown error"}`,
    };
  }

  try {
    const response = await axios.get(`${ollamaBase}/api/tags`, {
      timeout: 5000,
    });
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
      message: modelAvailable
        ? undefined
        : `Model "${model}" not found in Ollama.`,
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
  if (isOnesaMockModeEnabled()) {
    const value = {
      ok: true,
      ready: true,
      provider: "mock",
      model: "mock-onesa",
      endpoint: "local://mock-onesa",
      message: "Onesa mock mode is active.",
    };
    onesaReadinessCache = { checkedAt: Date.now(), value };
    lastOnesaSuccessAt = Date.now();
    return value;
  }

  const config = getOnesaConfig();
  const { provider, model, ollamaBase, openaiBase, timeoutMs } = config;
  const fallbackEndpoint =
    provider === "openai_compatible" ? openaiBase : ollamaBase;
  const now = Date.now();
  const probeTimeout = Math.min(timeoutMs, 10000);

  if (
    onesaReadinessCache &&
    now - onesaReadinessCache.checkedAt < ONESA_READINESS_CACHE_MS
  ) {
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
      resolvedModel:
        provider === "ollama"
          ? String((health as any)?.resolvedModel ?? model)
          : undefined,
    });
  }

  if (provider === "openai_compatible") {
    const providerTargets = buildCloudProviderTargets(config);
    const targetSummaries = providerTargets.map(target => ({
      name: target.name,
      baseUrl: target.baseUrl,
    }));
    if (providerTargets.length === 0) {
      return remember({
        ok: false,
        ready: false,
        provider,
        model,
        endpoint,
        providerTargets: targetSummaries,
        message: "Onesa is unavailable.",
      });
    }

    let observedRateLimit = false;
    let lastFailureMessage = "";

    for (const providerTarget of providerTargets) {
      const endpointBackoffMs = getEndpointBackoffRemainingMs(
        providerTarget.baseUrl
      );
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
              "anthropic-version":
                providerTarget.anthropicVersion ?? "2023-06-01",
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
          providerTargets: targetSummaries,
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
            providerTargets: targetSummaries,
          });
        }
        if (isRateLimitedUpstreamError(error)) {
          observedRateLimit = true;
          const retryAfterMs = getRetryAfterMs(error) ?? 10000;
          const existing =
            onesaProviderBackoffUntilByEndpoint.get(providerTarget.baseUrl) ??
            0;
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
      providerTargets: targetSummaries,
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
    const stillWarm =
      Date.now() - lastOnesaSuccessAt < ONESA_READINESS_GRACE_MS;
    return remember({
      ok: stillWarm,
      ready: stillWarm,
      provider,
      model,
      endpoint,
      resolvedModel:
        provider === "ollama"
          ? String((health as any)?.resolvedModel ?? model)
          : undefined,
      message: stillWarm ? undefined : "Onesa is unavailable.",
    });
  }
}

const onesaRouteDeps: OnesaRouteDeps = {
  generateOnesaReply,
  normalizeOnesaLanguage,
  enforceOnesaIdentityGuard,
  getOnesaHealth,
  getOnesaReadiness,
  getUpstreamStatus,
  getRetryAfterMs,
  getGlobalBackoffRemainingMs,
  isRateLimitedUpstreamError,
  onChatSuccess: () => {
    lastOnesaSuccessAt = Date.now();
    onesaReadinessCache = null;
  },
};

export function getOnesaRouteDeps(): OnesaRouteDeps {
  return onesaRouteDeps;
}
