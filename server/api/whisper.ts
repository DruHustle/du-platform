import express, { type Express } from "express";

export const config = { api: { bodyParser: false } };

async function handleWhisper(buffer: Buffer, res: any) {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "OPENAI_API_KEY is not configured." });
  }
  const formData = new FormData();
  const uint8 = new Uint8Array(buffer);
  formData.append("file", new Blob([uint8]), "audio.webm");
  formData.append("model", process.env.OPENAI_WHISPER_MODEL ?? "whisper-1");

  const baseUrl = (process.env.OPENAI_WHISPER_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    return res.status(response.status).json({ error: message || "Whisper request failed." });
  }

  const data = await response.json();
  return res.status(200).json(data);
}

export function registerWhisperRoutes(app: Express) {
  app.post("/api/whisper", express.raw({ type: "*/*", limit: "25mb" }), async (req, res) => {
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? []);
    return handleWhisper(buffer, res);
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const buffer = Buffer.concat(chunks);

  return handleWhisper(buffer, res);
}
