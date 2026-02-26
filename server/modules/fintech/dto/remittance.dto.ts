import { z } from 'zod';

export const fxQuoteSchema = z.object({
  amountSent: z.coerce.number().positive().max(5000),
  currencyFrom: z.string().trim().min(3).max(10),
  currencyTo: z.string().trim().min(3).max(10),
  receivingCountry: z.string().trim().min(2).max(3),
});

export const remittanceSchema = z.object({
  recipientName: z.string().trim().min(2).max(255),
  recipientType: z.enum(['mobile_money', 'cash_pickup', 'visa_card']),
  provider: z.string().trim().min(2).max(100),
  payoutChannel: z.string().trim().max(100).optional(),
  amountSent: z.coerce.number().positive().max(5000),
  currencyFrom: z.string().trim().min(3).max(10),
  currencyTo: z.string().trim().min(3).max(10),
  receivingCountry: z.string().trim().min(2).max(3),
  recipient: z.object({
    mobileNumber: z.string().trim().max(20).optional(),
    cashPickupLocation: z.string().trim().max(255).optional(),
    cardNumber: z.string().trim().max(40).optional(),
    cardExpiryMonth: z.string().trim().max(2).optional(),
    cardExpiryYear: z.string().trim().max(4).optional(),
    cardHolderName: z.string().trim().max(255).optional(),
  }),
  idempotencyKey: z.string().uuid().optional(),
});

export type FxQuoteDto = z.infer<typeof fxQuoteSchema>;
export type RemittanceDto = z.infer<typeof remittanceSchema>;
