import { CUSTOMER_LANGUAGES } from "../../../../shared/customerLanguage";
import { z } from "zod";

export const listProductsQuerySchema = z.object({
  category: z.string().trim().max(120).optional(),
});

export { shopOrderRequestSchema as createOrderSchema } from "../../../../shared/shopCheckout";

export const restockNotificationSchema = z.object({
  language: z.enum(CUSTOMER_LANGUAGES).default("en"),
  productId: z.coerce.number().int().positive().optional(),
  productSlug: z.string().trim().min(1).max(255),
  productName: z.string().trim().min(1).max(255),
  email: z.string().trim().email(),
});
