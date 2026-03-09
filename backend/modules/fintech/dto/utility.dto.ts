import { z } from 'zod';

export const electricityOptionsSchema = z.object({
  countryISOCode: z.string().trim().min(2).max(3).default('ZW'),
});

export const electricityPaymentSchema = z.object({
  meterNumber: z.string().trim().min(5).max(40),
  amount: z.coerce.number().positive().max(5000),
  currency: z.string().trim().min(3).max(10).optional(),
  customerName: z.string().trim().min(2).max(255).optional(),
  billerId: z.coerce.number().int().positive().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type ElectricityOptionsDto = z.infer<typeof electricityOptionsSchema>;
export type ElectricityPaymentDto = z.infer<typeof electricityPaymentSchema>;
