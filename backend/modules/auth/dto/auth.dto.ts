import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(255),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  password: z.string().min(8).max(255),
  confirmPassword: z.string().min(8).max(255).optional(),
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
  password: z.string().min(8).max(255),
  confirmPassword: z.string().min(8).max(255).optional(),
}).superRefine((value, ctx) => {
  if (value.confirmPassword !== undefined && value.password !== value.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match.",
    });
  }
});
