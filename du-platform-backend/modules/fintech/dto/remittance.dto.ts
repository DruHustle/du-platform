import { z } from 'zod';
import { getRemittancePolicy } from '../config/remittancePolicy';

const preciseAmount = (max = getRemittancePolicy().maxPerTransaction) =>
  z.coerce
    .number()
    .positive()
    .max(max)
    .refine((v) => Number(v.toFixed(2)) === v, { message: 'Amount must have at most 2 decimal places.' });

const bankAccountNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, '').toUpperCase())
  .pipe(z.string().min(6).max(20).regex(/^[A-Z0-9]+$/, 'Bank account number must contain only letters and digits.'));

export const fxQuoteSchema = z.object({
  amountSent: preciseAmount(),
  currencyFrom: z.string().trim().min(3).max(10),
  currencyTo: z.string().trim().min(3).max(10),
  receivingCountry: z.string().trim().min(2).max(3).default("ZW"),
  originCountry: z.string().trim().min(2).max(2).optional(),
  senderMsisdn: z.string().trim().min(7).max(20).optional(),
  // visa_card excluded until PAN encryption is implemented
  recipientType: z.enum(['mobile_money', 'cash_pickup', 'bank_transfer']).optional(),
  recipientMsisdn: z.string().trim().min(7).max(20).optional(),
  recipientBankName: z.string().trim().min(2).max(100).optional(),
  recipientBankAccountNumber: bankAccountNumberSchema.optional(),
  // recipientPan excluded — not used by quote endpoint and should never transit without encryption
});

export const remittanceSchema = z.object({
  recipientName: z.string().trim().min(2).max(255),
  // visa_card excluded until TerraPay PAN encryption (X-PAN header) is implemented
  recipientType: z.enum(['mobile_money', 'cash_pickup', 'bank_transfer']),
  provider: z.string().trim().min(2).max(100).optional(),
  payoutChannel: z.string().trim().max(100).optional(),
  amountSent: preciseAmount(),
  currencyFrom: z.string().trim().min(3).max(10),
  currencyTo: z.string().trim().min(3).max(10),
  receivingCountry: z.string().trim().min(2).max(3).default("ZW"),
  originCountry: z.string().trim().min(2).max(2).optional(),
  senderMsisdn: z.string().trim().min(7).max(20).optional(),
  recipient: z.object({
    mobileNumber: z.string().trim().max(20).optional(),
    cashPickupLocation: z.string().trim().max(255).optional(),
    bankName: z.string().trim().max(100).optional(),
    bankAccountNumber: bankAccountNumberSchema.optional(),
    // cardNumber, cardExpiry, cardHolderName excluded until PAN encryption is implemented
  }),
  quoteId: z.string().trim().min(8).max(64).optional(),
  quoteExpiryTime: z.string().trim().min(8).max(64).optional(),
  quoteToken: z.string().trim().min(32).max(512).optional(),
  quotedFxRate: z.number().positive().optional(),
  quotedReceivingAmount: z.number().positive().optional(),
  quotedReceivingCurrency: z.string().trim().min(3).max(10).optional(),
  quotedSenderFee: z.number().min(0).optional(),
  idempotencyKey: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  const policy = getRemittancePolicy();
  const hasProtectedQuote =
    Boolean(String(value.quoteId ?? "").trim()) ||
    Boolean(String(value.quoteExpiryTime ?? "").trim()) ||
    Boolean(String(value.quoteToken ?? "").trim()) ||
    value.quotedFxRate !== undefined ||
    value.quotedReceivingAmount !== undefined ||
    Boolean(String(value.quotedReceivingCurrency ?? "").trim());

  if (hasProtectedQuote) {
    if (!String(value.quoteId ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quoteId'],
        message: 'Quote identifier is required when paying with a protected quote.',
      });
    }

    if (!String(value.quoteExpiryTime ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quoteExpiryTime'],
        message: 'Quote expiry time is required when paying with a protected quote.',
      });
    }

    if (!String(value.quoteToken ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quoteToken'],
        message: 'Quote token is required when paying with a protected quote.',
      });
    }

    if (value.quotedFxRate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quotedFxRate'],
        message: 'Quoted FX rate is required when paying with a protected quote.',
      });
    }

    if (value.quotedReceivingAmount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quotedReceivingAmount'],
        message: 'Quoted receiving amount is required when paying with a protected quote.',
      });
    }

    if (!String(value.quotedReceivingCurrency ?? "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quotedReceivingCurrency'],
        message: 'Quoted receiving currency is required when paying with a protected quote.',
      });
    }
  }

  if (value.recipientType === 'cash_pickup' && !String(value.recipient.cashPickupLocation ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipient', 'cashPickupLocation'],
      message: 'Cash pickup location is required for cash pickup transfers.',
    });
  }

  if (value.recipientType === 'bank_transfer' && !String(value.recipient.bankAccountNumber ?? '').trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['recipient', 'bankAccountNumber'],
      message: 'Bank account number is required for bank transfers.',
    });
  }

  if (value.recipientType === 'bank_transfer') {
    const bankName = String(value.recipient.bankName ?? value.payoutChannel ?? '').trim();
    if (!bankName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient', 'bankName'],
        message: 'Bank name is required for bank transfers.',
      });
    } else if (!policy.supportedBanks.includes(bankName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipient', 'bankName'],
        message: `Unsupported bank. Allowed: ${policy.supportedBanks.join(', ')}.`,
      });
    }
  }
});

export type FxQuoteDto = z.infer<typeof fxQuoteSchema>;
export type RemittanceDto = z.infer<typeof remittanceSchema>;
