const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(input: unknown, maxLength = 255): string {
  return String(input ?? "")
    .replace(CONTROL_CHARS, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizePhoneNumber(input: unknown): string {
  const normalized = sanitizeText(input, 24).replace(/[^\d+]/g, "");
  if (normalized.startsWith("+")) return normalized;
  return normalized.replace(/^00/, "+");
}

export function sanitizeObject<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      out[key] = sanitizeText(value, 2000);
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.map((entry) => (typeof entry === "string" ? sanitizeText(entry, 2000) : entry));
      continue;
    }
    out[key] = value;
  }
  return out as T;
}
