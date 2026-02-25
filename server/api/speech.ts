import express, { type Express, type Request } from "express";

type SpeechJsonPayload = {
  action?: "llm" | "tts" | "stt";
  prompt?: string;
  text?: string;
  voiceId?: string;
  language?: string;
};

type SttResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

type TtsResult =
  | { ok: true; bytes: Uint8Array; mimeType: string; provider: "gemini" | "elevenlabs" }
  | { ok: false; status: number; error: string; provider?: "gemini" | "elevenlabs" };

type LlmResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string };

const DEFAULT_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const ELEVENLABS_TTS_MODEL_ID = "eleven_multilingual_v2";
const ELEVENLABS_MAX_CONCURRENT_REQUESTS = 1;
const DEFAULT_GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
const DEFAULT_GROQ_STT_MODEL = "whisper-large-v3-turbo";
const DEFAULT_GROQ_LLM_MODEL = "llama3-8b-8192";
let activeElevenLabsRequests = 0;
const elevenLabsWaitQueue: Array<() => void> = [];

async function acquireElevenLabsSlot(): Promise<void> {
  while (activeElevenLabsRequests >= ELEVENLABS_MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => {
      elevenLabsWaitQueue.push(resolve);
    });
  }
  activeElevenLabsRequests += 1;
}

function releaseElevenLabsSlot(): void {
  activeElevenLabsRequests = Math.max(0, activeElevenLabsRequests - 1);
  const next = elevenLabsWaitQueue.shift();
  if (next) next();
}

function getRequestBuffer(req: Request): Buffer {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body instanceof Uint8Array) return Buffer.from(req.body);
  return Buffer.from([]);
}

async function parseJsonBody(req: Request): Promise<SpeechJsonPayload> {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) && !(req.body instanceof Uint8Array)) {
    return req.body as SpeechJsonPayload;
  }
  const raw = getRequestBuffer(req).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw) as SpeechJsonPayload;
}

async function parseMultipartForm(req: Request): Promise<FormData> {
  const contentType = String(req.headers["content-type"] ?? "");
  const body = getRequestBuffer(req);
  const request = new Request("http://localhost/api/speech", {
    method: "POST",
    headers: { "content-type": contentType },
    body: new Blob([new Uint8Array(body)]),
  });
  return await request.formData();
}

function getElevenLabsApiKey(): string {
  const candidates = [
    process.env.ELEVENLABS_API_KEY,
    process.env.ONESA_ELEVENLABS_API_KEY,
    process.env.ELEVENLABS_TTS_API_KEY,
    process.env.ELEVEN_LABS_API_KEY,
    process.env.VITE_ELEVENLABS_API_KEY,
  ];
  for (const value of candidates) {
    const key = String(value ?? "").trim();
    if (key) return key;
  }
  return "";
}

function getGeminiApiKey(): string {
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.ONESA_GEMINI_API_KEY,
    process.env.ONESA_AI_API_KEY,
  ];
  for (const value of candidates) {
    const key = String(value ?? "").trim();
    if (key) return key;
  }
  return "";
}

function getGeminiBaseUrl(): string {
  return String(
    process.env.ONESA_GEMINI_BASE_URL ??
      process.env.ONESA_AI_BASE_URL ??
      "https://generativelanguage.googleapis.com/v1beta/openai"
  ).replace(/\/+$/, "");
}

function getGeminiTtsModel(): string {
  return String(
    process.env.ONESA_GEMINI_TTS_MODEL ??
      process.env.GEMINI_TTS_MODEL ??
      DEFAULT_GEMINI_TTS_MODEL
  ).trim();
}

function getGroqApiKey(): string {
  return String(
    process.env.GROQ_API_KEY ??
      process.env.ONESA_GROQ_API_KEY ??
      process.env.ONESA_SECONDARY_AI_API_KEY ??
      process.env.ONESA_GROK_AI_API_KEY ??
      ""
  ).trim();
}

function getGroqBaseUrl(): string {
  return String(
    process.env.GROQ_WHISPER_BASE_URL ??
      process.env.GROQ_BASE_URL ??
      process.env.ONESA_GROQ_WHISPER_BASE_URL ??
      process.env.ONESA_GROQ_BASE_URL ??
      process.env.ONESA_SECONDARY_AI_BASE_URL ??
      process.env.ONESA_GROK_AI_BASE_URL ??
      "https://api.groq.com/openai/v1"
  ).replace(/\/+$/, "");
}

function buildQuotaSafeTtsSnippet(text: string): string {
  const normalized = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0]?.trim() ?? normalized;
  const base = firstSentence.length >= 24 ? firstSentence : normalized;
  const maxChars = 170;
  if (base.length <= maxChars) return base;
  return `${base.slice(0, maxChars - 3).trimEnd()}...`;
}

function normalizeTtsLanguage(input?: string): "en" | "de" | "sn" | "nd" {
  const raw = String(input ?? "").trim().toLowerCase();
  const base = raw.split("-")[0];
  if (base === "de" || raw === "german" || raw === "deutsch") return "de";
  if (base === "sn" || raw === "shona") return "sn";
  if (base === "nd" || base === "nr" || raw === "ndebele") return "nd";
  return "en";
}

function shouldUseElevenLabs(language: "en" | "de" | "sn" | "nd"): boolean {
  return language === "sn" || language === "nd";
}

function getGeminiVoiceCandidates(language: "en" | "de" | "sn" | "nd"): string[] {
  const byLanguage =
    language === "de"
      ? [
          process.env.ONESA_GEMINI_TTS_VOICE_DE,
          process.env.GEMINI_TTS_VOICE_DE,
          process.env.ONESA_GEMINI_TTS_VOICE,
          process.env.GEMINI_TTS_VOICE,
          "Kore",
          "Aoede",
        ]
      : [
          process.env.ONESA_GEMINI_TTS_VOICE_EN,
          process.env.GEMINI_TTS_VOICE_EN,
          process.env.ONESA_GEMINI_TTS_VOICE,
          process.env.GEMINI_TTS_VOICE,
          "Aoede",
          "Kore",
        ];
  return Array.from(
    new Set(
      byLanguage
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

async function requestGroqStt(file: Blob): Promise<SttResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return { ok: false, status: 503, error: "GROQ_API_KEY is not configured." };

  const form = new FormData();
  form.append("file", file, "audio.webm");
  form.append("model", process.env.GROQ_WHISPER_MODEL ?? DEFAULT_GROQ_STT_MODEL);

  try {
    const response = await fetch(`${getGroqBaseUrl()}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: errorText || "Groq STT error." };
    }

    const payload = (await response.json()) as { text?: string };
    const text = String(payload?.text ?? "").trim();
    if (!text) return { ok: false, status: 502, error: "Groq STT returned empty text." };
    return { ok: true, text };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "Groq STT network error." };
  }
}

async function requestElevenLabsTts(text: string, voiceId?: string): Promise<TtsResult> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) return { ok: false, status: 503, error: "ELEVENLABS_API_KEY is not configured.", provider: "elevenlabs" };

  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalizedText) return { ok: false, status: 400, error: "Text input is required.", provider: "elevenlabs" };

  const resolvedVoiceId = String(voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID).trim() || DEFAULT_ELEVENLABS_VOICE_ID;
  const maxAttempts = 3;
  const conciseSnippet = buildQuotaSafeTtsSnippet(normalizedText);
  const textVariants = conciseSnippet && conciseSnippet !== normalizedText ? [normalizedText, conciseSnippet] : [normalizedText];
  let lastQuotaError: { status: number; error: string } | null = null;

  await acquireElevenLabsSlot();
  try {
    for (let variantIndex = 0; variantIndex < textVariants.length; variantIndex++) {
      const candidateText = textVariants[variantIndex];
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: candidateText,
            model_id: ELEVENLABS_TTS_MODEL_ID,
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          const concurrentLimitError =
            response.status === 429 && /concurrent_limit_exceeded|too many concurrent requests/i.test(errorText);
          if (concurrentLimitError && attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
            continue;
          }

          const quotaExceededError =
            /quota_exceeded|exceeds your quota|insufficient credits|credits remaining/i.test(errorText);
          if (quotaExceededError && variantIndex === 0 && textVariants.length > 1) {
            lastQuotaError = { status: response.status, error: errorText || "ElevenLabs quota exceeded." };
            break;
          }

          return { ok: false, status: response.status, error: errorText || "ElevenLabs TTS error.", provider: "elevenlabs" };
        }

        const arrayBuffer = await response.arrayBuffer();
        return { ok: true, bytes: new Uint8Array(arrayBuffer), mimeType: "audio/mpeg", provider: "elevenlabs" };
      }
    }
    if (lastQuotaError) return { ok: false, status: lastQuotaError.status, error: lastQuotaError.error, provider: "elevenlabs" };
    return { ok: false, status: 502, error: "ElevenLabs TTS retry loop exhausted.", provider: "elevenlabs" };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "ElevenLabs TTS network error.", provider: "elevenlabs" };
  } finally {
    releaseElevenLabsSlot();
  }
}

async function requestGeminiTts(text: string, language: "en" | "de" | "sn" | "nd"): Promise<TtsResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { ok: false, status: 503, error: "GEMINI_API_KEY is not configured.", provider: "gemini" };

  const normalizedText = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!normalizedText) return { ok: false, status: 400, error: "Text input is required.", provider: "gemini" };

  const baseUrl = getGeminiBaseUrl();
  const model = getGeminiTtsModel();
  const responseFormat = String(process.env.GEMINI_TTS_RESPONSE_FORMAT ?? "mp3").trim();
  const voiceCandidates = getGeminiVoiceCandidates(language);
  const attempts = voiceCandidates.length ? voiceCandidates : [""];
  let lastError = "";
  let lastStatus = 502;

  for (const voice of attempts) {
    try {
      const payload: Record<string, unknown> = {
        model,
        input: normalizedText,
      };
      if (responseFormat) payload.response_format = responseFormat;
      if (voice) payload.voice = voice;

      const response = await fetch(`${baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        lastError = errorText || "Gemini TTS error.";
        lastStatus = response.status;
        const invalidVoice = response.status === 400 && /voice|unsupported|invalid/i.test(lastError);
        if (invalidVoice && voice) continue;
        return { ok: false, status: response.status, error: lastError, provider: "gemini" };
      }

      const arrayBuffer = await response.arrayBuffer();
      const mimeType = String(response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim() || "audio/mpeg";
      return { ok: true, bytes: new Uint8Array(arrayBuffer), mimeType, provider: "gemini" };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Gemini TTS network error.";
      lastStatus = 502;
    }
  }

  return { ok: false, status: lastStatus, error: lastError || "Gemini TTS network error.", provider: "gemini" };
}

async function requestTtsForLanguage(text: string, options: { voiceId?: string; language?: string }): Promise<TtsResult> {
  const normalizedLanguage = normalizeTtsLanguage(options.language);
  if (shouldUseElevenLabs(normalizedLanguage)) {
    return await requestElevenLabsTts(text, options.voiceId);
  }
  return await requestGeminiTts(text, normalizedLanguage);
}

async function requestGroqLlm(prompt: string): Promise<LlmResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) return { ok: false, status: 503, error: "GROQ_API_KEY is not configured." };

  try {
    const response = await fetch(`${getGroqBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model:
          process.env.GROQ_MODEL ??
          process.env.ONESA_SECONDARY_MODEL ??
          process.env.ONESA_GROQ_MODEL ??
          process.env.ONESA_GROK_MODEL ??
          DEFAULT_GROQ_LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: errorText || "Groq LLM error." };
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) return { ok: false, status: 502, error: "Groq LLM returned empty response." };
    return { ok: true, reply };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "Groq LLM network error." };
  }
}

export function registerWhisperRoutes(app: Express) {
  // Groq-only whisper route (OpenAI Whisper removed)
  app.post("/api/whisper", express.raw({ type: "*/*", limit: "25mb" }), async (req, res) => {
    const buffer = getRequestBuffer(req);
    const blob = new Blob([new Uint8Array(buffer)], { type: "audio/webm" });
    const result = await requestGroqStt(blob);
    if (!result.ok) return res.status(result.status).json({ error: result.error, provider: "groq" });
    return res.status(200).json({ text: result.text });
  });
}

export function registerTtsRoutes(app: Express) {
  // Legacy route retained for compatibility.
  app.post("/api/tts", express.json({ limit: "1mb" }), async (req, res) => {
    const body = (req.body ?? {}) as { text?: string; voiceId?: string; language?: string };
    const text = String(body.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Text input is required." });

    const tts = await requestTtsForLanguage(text, { voiceId: body.voiceId, language: body.language });
    if (!tts.ok) return res.status(tts.status).json({ error: tts.error, provider: tts.provider ?? "unknown" });
    res.setHeader("Content-Type", tts.mimeType);
    return res.status(200).send(Buffer.from(tts.bytes));
  });
}

export function registerSpeechRoutes(app: Express) {
  // JSON branch: action=tts|llm
  app.post("/api/speech", express.json({ limit: "1mb" }), async (req, res, next) => {
    const contentType = String(req.headers["content-type"] ?? "");
    if (!contentType.includes("application/json")) return next();

    let body: SpeechJsonPayload;
    try {
      body = await parseJsonBody(req);
    } catch {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }

    if (body.action === "tts") {
      const text = String(body.text ?? "").trim();
      if (!text) return res.status(400).json({ error: "Text input is required." });
      const tts = await requestTtsForLanguage(text, { voiceId: body.voiceId, language: body.language });
      if (!tts.ok) return res.status(tts.status).json({ error: tts.error, provider: tts.provider ?? "unknown" });
      res.setHeader("Content-Type", tts.mimeType);
      return res.status(200).send(Buffer.from(tts.bytes));
    }

    if (body.action === "llm") {
      const prompt = String(body.prompt ?? "").trim();
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });
      const llm = await requestGroqLlm(prompt);
      if (!llm.ok) return res.status(llm.status).json({ error: llm.error });
      return res.status(200).json({ reply: llm.reply });
    }

    return res.status(400).json({ error: "Invalid JSON action" });
  });

  // Multipart branch: action=stt (Groq only)
  app.post("/api/speech", express.raw({ type: "*/*", limit: "25mb" }), async (req, res) => {
    const contentType = String(req.headers["content-type"] ?? "");
    if (!contentType.includes("multipart/form-data")) {
      return res.status(415).json({ error: "Unsupported Content-Type" });
    }
    try {
      const form = await parseMultipartForm(req);
      const action = String(form.get("action") ?? "").toLowerCase();
      if (action !== "stt") return res.status(400).json({ error: "Invalid multipart action" });

      const fileEntry = form.get("file");
      if (!(fileEntry instanceof Blob)) return res.status(400).json({ error: "Audio file is required." });

      const stt = await requestGroqStt(fileEntry);
      if (!stt.ok) return res.status(stt.status).json({ error: stt.error, provider: "groq" });
      return res.status(200).json({ text: stt.text });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Speech STT error." });
    }
  });
}
