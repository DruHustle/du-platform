import { z } from 'zod';

export const listProductsQuerySchema = z.object({
  category: z.string().trim().max(120).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive(),
    })
  ).min(1),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email(),
  shippingCountry: z.string().trim().min(2).max(120),
  shippingCity: z.string().trim().min(2).max(120),
  shippingAddress: z.string().trim().min(5).max(400),
  deliverySpeed: z.enum(["normal", "express"]).optional(),
  paymentMethod: z.enum(["manual_assisted", "dummy_gateway"]),
});

export const restockNotificationSchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
  productSlug: z.string().trim().min(1).max(255),
  productName: z.string().trim().min(1).max(255),
  email: z.string().trim().email(),
});
