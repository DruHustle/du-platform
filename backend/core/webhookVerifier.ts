import crypto from "crypto";
import type express from "express";

function normalizeCandidateSignatures(rawValues: string[]): string[] {
  const candidates = new Set<string>();

  for (const rawValue of rawValues) {
    const value = String(rawValue ?? "").trim();
    if (!value) continue;

    candidates.add(value);

    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      candidates.add(trimmed);

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        candidates.add(trimmed.slice(eqIndex + 1).trim());
      }
    }

    if (value.startsWith("sha256=")) {
      candidates.add(value.slice("sha256=".length).trim());
    }
  }

  return Array.from(candidates).filter(Boolean);
}

function safeCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyWebhookHmacSignature(input: {
  req: express.Request;
  secret: string;
  headerNames?: string[];
}): boolean {
  const secret = String(input.secret ?? "").trim();
  if (!secret) return false;

  const rawBody =
    typeof (input.req as any).rawBody === "string"
      ? String((input.req as any).rawBody)
      : JSON.stringify(input.req.body ?? {});

  const headerNames = input.headerNames ?? [
    "x-fintech-webhook-signature",
    "x-webhook-signature",
    "x-signature",
    "x-signature-sha256",
    "x-terrapay-signature",
    "x-reloadly-signature",
  ];

  const rawHeaderValues = headerNames.flatMap((headerName) => {
    const header = input.req.get(headerName);
    return header ? [header] : [];
  });
  if (rawHeaderValues.length === 0) return false;

  const candidates = normalizeCandidateSignatures(rawHeaderValues);
  if (candidates.length === 0) return false;

  const hmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const expectedHex = hmac.toString("hex");
  const expectedBase64 = hmac.toString("base64");

  return candidates.some((candidate) => safeCompare(candidate, expectedHex) || safeCompare(candidate, expectedBase64));
}
