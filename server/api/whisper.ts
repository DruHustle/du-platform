import express, { type Express } from "express";

export const config = { api: { bodyParser: false } };

type WhisperProvider = {
  name: "groq" | "openai";
  baseUrl: string;
  apiKey: string;
  model: string;
};

function createWhisperFormData(buffer: Buffer, model: string) {
  const formData = new FormData();
  const uint8 = new Uint8Array(buffer);
  formData.append("file", new Blob([uint8]), "audio.webm");
  formData.append("model", model);
  return formData;
}

function getWhisperProviders(): WhisperProvider[] {
  const providers: WhisperProvider[] = [];

  const groqApiKey = process.env.GROQ_API_KEY ?? process.env.ONESA_SECONDARY_AI_API_KEY;
  if (groqApiKey) {
    providers.push({
      name: "groq",
      baseUrl: (process.env.GROQ_WHISPER_BASE_URL ?? process.env.ONESA_SECONDARY_AI_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
      apiKey: groqApiKey,
      model: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3",
    });
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push({
      name: "openai",
      baseUrl: (process.env.OPENAI_WHISPER_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_WHISPER_MODEL ?? "whisper-1",
    });
  }

  return providers;
}

async function handleWhisper(buffer: Buffer, res: any) {
  try {
    const providers = getWhisperProviders();
    if (!providers.length) {
      return res.status(503).json({
        error:
          "Whisper is not configured. Set GROQ_API_KEY/ONESA_SECONDARY_AI_API_KEY and/or OPENAI_API_KEY.",
      });
    }

    const errors: Array<{ provider: string; status: number; message: string }> = [];

    for (const provider of providers) {
      try {
        const response = await fetch(`${provider.baseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          body: createWhisperFormData(buffer, provider.model),
        });

        if (response.ok) {
          const data = await response.json();
          return res.status(200).json(data);
        }

        const message = await response.text();
        errors.push({
          provider: provider.name,
          status: response.status,
          message: message || "Whisper request failed.",
        });
      } catch (error) {
        errors.push({
          provider: provider.name,
          status: 502,
          message: error instanceof Error ? error.message : "Whisper upstream network error.",
        });
      }
    }

    const last = errors[errors.length - 1];
    return res.status(last?.status || 502).json({
      error: last?.message || "Whisper request failed.",
      providersTried: errors.map((item) => ({ provider: item.provider, status: item.status })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected whisper handler error.",
    });
  }
}

export function registerWhisperRoutes(app: Express) {
  app.post("/api/whisper", express.raw({ type: "*/*", limit: "25mb" }), async (req, res) => {
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? []);
    try {
      return await handleWhisper(buffer, res);
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unexpected whisper route error.",
      });
    }
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const buffer = Buffer.concat(chunks);

  return handleWhisper(buffer, res);
}
