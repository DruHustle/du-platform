export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  const formData = new FormData();
  formData.append("file", new Blob([buffer]), "audio.webm");
  formData.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  const data = await response.json();
  res.status(200).json(data);
}
