import { z } from 'zod';

const preciseAmount = (max = 5000) =>
  z.coerce
    .number()
    .positive()
    .max(max)
    .refine((v) => Number(v.toFixed(2)) === v, { message: 'Amount must have at most 2 decimal places.' });

export const airtimeLookupSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  amount: preciseAmount().optional(),
});

export const airtimeTopupSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  amount: preciseAmount(),
  currency: z.string().trim().min(3).max(10).optional(),
  idempotencyKey: z.string().uuid(),
});

export type AirtimeLookupDto = z.infer<typeof airtimeLookupSchema>;
export type AirtimeTopupDto = z.infer<typeof airtimeTopupSchema>;
