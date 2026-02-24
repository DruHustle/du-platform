import express, { type Express } from "express";

type TtsRequest = {
  text?: string;
  voice?: string;
  model?: string;
  speed?: number;
};

function parseModelCandidates(primary?: string, fallback?: string, csv?: string): string[] {
  const candidates = [
    primary?.trim(),
    fallback?.trim(),
    ...(csv ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates));
}

function isThrottleLike(status: number, message: string): boolean {
  if (status === 429) return true;
  return /insufficient_quota|quota|rate[\s_-]?limit|throttl/i.test(message);
}

export function registerTtsRoutes(app: Express) {
  app.post("/api/tts", express.json({ limit: "1mb" }), async (req, res) => {
    const apiKey = process.env.OPENAI_TTS_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });
    }
    const { text, voice, model, speed } = (req.body ?? {}) as TtsRequest;
    const input = String(text ?? "").trim();
    if (!input) return res.status(400).json({ error: "Text input is required." });

    const baseUrl = (process.env.OPENAI_TTS_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(
      /\/+$/,
      ""
    );
    const models = parseModelCandidates(
      model || process.env.OPENAI_TTS_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini-tts",
      process.env.OPENAI_TTS_FALLBACK_MODEL ?? process.env.OPENAI_FALLBACK_MODEL,
      process.env.OPENAI_TTS_MODEL_CANDIDATES ?? process.env.OPENAI_MODEL_CANDIDATES
    );
    const errors: Array<{ model: string; status: number; message: string }> = [];

    for (const candidateModel of models) {
      try {
        const response = await fetch(`${baseUrl}/audio/speech`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: candidateModel,
            input,
            voice: voice || "alloy",
            response_format: "mp3",
            speed: typeof speed === "number" ? speed : 1,
          }),
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          res.setHeader("Content-Type", "audio/mpeg");
          return res.status(200).send(Buffer.from(arrayBuffer));
        }

        const message = await response.text();
        errors.push({ model: candidateModel, status: response.status, message: message || "TTS request failed." });
      } catch (error) {
        errors.push({
          model: candidateModel,
          status: 502,
          message: error instanceof Error ? error.message : "TTS upstream network error.",
        });
      }
    }

    const last = errors[errors.length - 1];
    const throttled = errors.some((item) => isThrottleLike(item.status, item.message));
    return res.status(throttled ? 429 : last?.status || 502).json({
      error: last?.message || "TTS request failed.",
      throttled,
      modelsTried: errors.map((item) => ({ model: item.model, status: item.status })),
    });
  });
}
