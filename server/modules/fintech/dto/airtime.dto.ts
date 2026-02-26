import { z } from 'zod';

export const airtimeLookupSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
});

export const airtimeTopupSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  amount: z.coerce.number().positive().max(5000),
  currency: z.string().trim().min(3).max(10).optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type AirtimeLookupDto = z.infer<typeof airtimeLookupSchema>;
export type AirtimeTopupDto = z.infer<typeof airtimeTopupSchema>;
