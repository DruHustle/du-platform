import {
  getPasswordIssue,
  PASSWORD_ERROR_MESSAGES,
} from "../../../../shared/passwordPolicy";
import { z } from "zod";

const passwordSchema = z.string().superRefine((value, ctx) => {
  const issue = getPasswordIssue(value);
  if (issue)
    ctx.addIssue({ code: "custom", message: PASSWORD_ERROR_MESSAGES[issue] });
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(255),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().email(),
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(255).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.confirmPassword !== undefined &&
      value.password !== value.confirmPassword
    ) {
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

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1).max(255).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.confirmPassword !== undefined &&
      value.password !== value.confirmPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });
