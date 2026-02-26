import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(255),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().email(),
  password: z.string().min(8).max(255),
});
