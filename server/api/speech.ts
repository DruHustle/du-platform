import express, { type Express, type Request } from "express";

type SpeechJsonPayload = {
  action?: "llm" | "tts" | "stt";
  prompt?: string;
  text?: string;
  voiceId?: string;
};

type SttResult =
  | { ok: true; text: string }
  | { ok: false; status: number; error: string };

type TtsResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: number; error: string };

type LlmResult =
  | { ok: true; reply: string }
  | { ok: false; status: number; error: string };

const DEFAULT_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
const DEFAULT_GROQ_STT_MODEL = "whisper-large-v3-turbo";
const DEFAULT_GROQ_LLM_MODEL = "llama3-8b-8192";

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
  return String(
    process.env.ELEVENLABS_API_KEY ??
      process.env.ONESA_ELEVENLABS_API_KEY ??
      process.env.ONESA_AI_API_KEY ??
      ""
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

async function requestElevenLabsStt(file: Blob): Promise<SttResult> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) return { ok: false, status: 503, error: "ELEVENLABS_API_KEY is not configured." };

  const form = new FormData();
  form.append("file", file, "audio.webm");
  form.append("model_id", "scribe_v1");

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: errorText || "ElevenLabs STT error." };
    }

    const payload = (await response.json()) as { text?: string };
    const text = String(payload?.text ?? "").trim();
    if (!text) return { ok: false, status: 502, error: "ElevenLabs STT returned empty text." };
    return { ok: true, text };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "ElevenLabs STT network error." };
  }
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
  if (!apiKey) return { ok: false, status: 503, error: "ELEVENLABS_API_KEY is not configured." };

  const resolvedVoiceId = String(voiceId ?? DEFAULT_ELEVENLABS_VOICE_ID).trim() || DEFAULT_ELEVENLABS_VOICE_ID;

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: errorText || "ElevenLabs TTS error." };
    }

    const arrayBuffer = await response.arrayBuffer();
    return { ok: true, bytes: new Uint8Array(arrayBuffer) };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "ElevenLabs TTS network error." };
  }
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
  // ElevenLabs-only route used by legacy callers.
  app.post("/api/tts", express.json({ limit: "1mb" }), async (req, res) => {
    const body = (req.body ?? {}) as { text?: string; voiceId?: string };
    const text = String(body.text ?? "").trim();
    if (!text) return res.status(400).json({ error: "Text input is required." });

    const tts = await requestElevenLabsTts(text, body.voiceId);
    if (!tts.ok) return res.status(tts.status).json({ error: tts.error });
    res.setHeader("Content-Type", "audio/mpeg");
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
      const tts = await requestElevenLabsTts(text, body.voiceId);
      if (!tts.ok) return res.status(tts.status).json({ error: tts.error });
      res.setHeader("Content-Type", "audio/mpeg");
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

  // Multipart branch: action=stt&provider=elevenlabs|groq
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

      const providerRaw = String(form.get("provider") ?? "elevenlabs").toLowerCase();
      const provider = providerRaw === "groq" ? "groq" : "elevenlabs";
      const stt = provider === "groq" ? await requestGroqStt(fileEntry) : await requestElevenLabsStt(fileEntry);
      if (!stt.ok) return res.status(stt.status).json({ error: stt.error, provider });
      return res.status(200).json({ text: stt.text });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Speech STT error." });
    }
  });
}
