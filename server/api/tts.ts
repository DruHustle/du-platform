import type express from "express";

type TtsRequest = {
  text?: string;
  voice?: string;
  model?: string;
  speed?: number;
};

export function registerTtsRoutes(app: express.Express) {
  app.post("/api/tts", express.json({ limit: "1mb" }), async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });
    }
    const { text, voice, model, speed } = (req.body ?? {}) as TtsRequest;
    const input = String(text ?? "").trim();
    if (!input) return res.status(400).json({ error: "Text input is required." });

    const baseUrl = (process.env.OPENAI_TTS_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        input,
        voice: voice || "alloy",
        response_format: "mp3",
        speed: typeof speed === "number" ? speed : 1,
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      return res.status(response.status).json({ error: message || "TTS request failed." });
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    return res.status(200).send(Buffer.from(arrayBuffer));
  });
}
