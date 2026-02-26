import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.string().trim().max(120).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      slug: z.string().trim().min(1),
      quantity: z.coerce.number().int().positive(),
    })
  ).min(1),
  customer: z.object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6).max(30),
  }),
  shippingAddress: z.string().trim().min(5).max(400),
});
