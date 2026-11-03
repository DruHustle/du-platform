// Client-visible API enum. The backend returns and enforces allowed transitions.
export const ORDER_STAGES = [
  "request_received",
  "under_review",
  "quote_sent",
  "quote_accepted",
  "payment_confirmed",
  "dispatched",
  "delivered",
  "cancelled",
] as const;
