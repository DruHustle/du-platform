import { CUSTOMER_LANGUAGES } from "./customerLanguage";
import { SHOP_CURRENCIES } from "./shopCurrency";
import { z } from "zod";

// Shared constraints match the persisted order fields. Prices are always read
// from the server catalogue, never accepted from a checkout request.
export const shopOrderRequestSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive().max(2_147_483_647),
      })
    )
    .min(1)
    .max(200)
    .refine(
      items => new Set(items.map(item => item.productId)).size === items.length,
      "Each product must appear only once."
    ),
  currency: z.enum(SHOP_CURRENCIES).default("EUR"),
  pricingRevision: z.string().max(60).optional(),
  language: z.enum(CUSTOMER_LANGUAGES).default("en"),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().toLowerCase().email().max(254),
  shippingCountry: z.string().trim().min(2).max(120),
  shippingCity: z.string().trim().min(2).max(120),
  shippingAddress: z.string().trim().min(5).max(400),
  deliverySpeed: z.enum(["normal", "express"]).default("normal"),
  paymentMethod: z.enum(["manual_assisted", "dummy_gateway"]),
  // An optional 256-bit bearer grant makes retries address the same order.
  // It travels in the request body, never a URL, and only its hash is stored.
  requestToken: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});

export function calculateShopShippingCents(
  subtotalCents: number,
  deliverySpeed: "normal" | "express"
): number {
  if (subtotalCents <= 0) return 0;
  return (
    (subtotalCents >= 7_500 ? 0 : 1_200) +
    (deliverySpeed === "express" ? 800 : 0)
  );
}
