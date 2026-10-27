import { safeSessionStorage } from "@/lib/browserStorage";
import type { TravelQuote } from "@shared/travel";
const key = "du_travel_chat_draft_v1";
// No query-string travel data, provider tokens, signatures or automatic AI call.
export function prepareTravelChatDraft(
  quote: TravelQuote,
  introduction: string
) {
  const summary = [
    `${quote.provider} · ${quote.title}`,
    `${quote.currency} ${quote.price}`,
    quote.category === "flights"
      ? `${quote.criteria.origin} → ${quote.criteria.destination}`
      : quote.criteria.destination,
    `${quote.criteria.departure} → ${quote.criteria.tripType === "one-way" && quote.category === "flights" ? "—" : quote.criteria.returnDate}`,
    ...quote.legs.map(
      leg =>
        `${leg.route.join(" → ")} · ${leg.departureTime.replace("T", " ")} → ${leg.arrivalTime.replace("T", " ")}`
    ),
  ].join("\n");
  const message = `${introduction}\n\n${summary}`;
  if (message.length > 6000) return false;
  const value = JSON.stringify({ message, expiresAt: Date.now() + 900000 });
  safeSessionStorage.setItem(key, value);
  return safeSessionStorage.getItem(key) === value;
}
export function consumeTravelChatDraft() {
  const raw = safeSessionStorage.getItem(key);
  safeSessionStorage.removeItem(key);
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      typeof value.message !== "string" ||
      value.message.length > 6000 ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= Date.now() ||
      value.expiresAt > Date.now() + 900000
    )
      return null;
    return value.message as string;
  } catch {
    return null;
  }
}
