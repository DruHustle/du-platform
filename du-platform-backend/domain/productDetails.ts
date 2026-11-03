import { z } from "./validation";
const detail = z.string().trim().max(2000).default("");
export const productDetailsSchema = z.object({
  sizes: detail,
  variants: detail,
  sizeGuidance: detail,
  dimensions: detail,
  materials: detail,
  ingredients: detail,
  allergens: detail,
  netQuantity: detail,
  storage: detail,
  origin: detail,
  supplier: detail,
  deliveryEligibility: detail,
  handling: detail,
  photos: z
    .array(
      z
        .string()
        .max(500)
        .refine(v => /^https:\/\//.test(v) || /^\/images\/[\w/.-]+$/.test(v))
    )
    .max(8)
    .default([]),
  sources: z
    .array(
      z
        .string()
        .url()
        .max(1000)
        .refine(v => v.startsWith("https://"))
    )
    .max(8)
    .default([]),
});
export type ProductDetails = z.infer<typeof productDetailsSchema>;
