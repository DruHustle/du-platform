import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(255)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must contain at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character.');

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(255),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  password: passwordSchema,
  confirmPassword: z.string().min(1).max(255).optional(),
}).superRefine((value, ctx) => {
  if (value.confirmPassword !== undefined && value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: passwordSchema,
  confirmPassword: z.string().min(1).max(255).optional(),
}).superRefine((value, ctx) => {
  if (value.confirmPassword !== undefined && value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
});

export const kycDecisionSchema = z.object({
  userId: z.coerce.number().int().positive(),
  verified: z.coerce.boolean(),
});
