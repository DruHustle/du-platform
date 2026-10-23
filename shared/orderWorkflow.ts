import { z } from "./validation";
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
export type OrderStage = (typeof ORDER_STAGES)[number];
export const orderCommandSchema = z.object({
  requestId: z.string().uuid(),
  version: z.number().int().nonnegative(),
  action: z.enum([
    ...ORDER_STAGES,
    "note",
    "assign",
    "refund",
    "restock_return",
    "payment_issue",
  ]),
  note: z.string().trim().max(4000).default(""),
  publicMessage: z.string().trim().max(1000).default(""),
  assignedTo: z.string().trim().email().max(254).optional(),
  paymentReference: z.string().trim().min(1).max(255).optional(),
  carrier: z.string().trim().min(1).max(120).optional(),
  tracking: z.string().trim().min(1).max(255).optional(),
  restock: z.boolean().optional(),
  refundCents: z.number().int().positive().max(2147483647).optional(),
  refundReference: z.string().trim().min(1).max(255).optional(),
  quote: z
    .object({
      currency: z.enum(["EUR", "USD", "ZAR"]),
      unitPrices: z
        .array(z.number().int().nonnegative().max(100000000))
        .min(1)
        .max(200),
      shippingCents: z.number().int().nonnegative().max(100000000),
      validUntil: z.string().datetime(),
    })
    .optional(),
});
export type OrderCommand = z.infer<typeof orderCommandSchema>;
const transitions: Record<OrderStage, OrderStage[]> = {
  request_received: ["under_review", "cancelled"],
  under_review: ["quote_sent", "cancelled"],
  quote_sent: ["quote_sent", "quote_accepted", "under_review", "cancelled"],
  quote_accepted: ["under_review", "payment_confirmed", "cancelled"],
  payment_confirmed: ["dispatched", "cancelled"],
  dispatched: ["delivered", "cancelled"],
  delivered: ["cancelled"],
  cancelled: [],
};
export function permittedOrderTransition(from: OrderStage, to: OrderStage) {
  return transitions[from]?.includes(to) ?? false;
}
export function orderNextAction(stage: OrderStage, expired = false) {
  return expired && stage === "quote_sent"
    ? "Request a revised quote before accepting."
    : {
        request_received:
          "The shop will review availability and your delivery destination.",
        under_review:
          "The shop is preparing a final quote; no payment is due yet.",
        quote_sent:
          "Review the final quote and accept it before the validity date.",
        quote_accepted:
          "Contact the shop to arrange the agreed assisted payment. Stock is checked again when payment is recorded.",
        payment_confirmed: "Payment recorded. The shop will prepare dispatch.",
        dispatched:
          "Use the carrier and tracking reference for delivery enquiries.",
        delivered: "Delivery recorded. Contact the shop with any concerns.",
        cancelled:
          "Request cancelled. Contact the shop about any recorded refund.",
      }[stage];
}
