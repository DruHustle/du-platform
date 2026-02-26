import { z } from 'zod';

export const chatRequestSchema = z.object({
  sessionId: z.string().trim().min(8).max(128),
  message: z.string().trim().min(1).max(4000),
  locale: z.string().trim().max(12).optional(),
});

export const tripPlanSchema = z.object({
  sessionId: z.string().trim().min(8).max(128),
  destination: z.string().trim().min(2).max(120),
  startDate: z.string().trim().min(8).max(30),
  endDate: z.string().trim().min(8).max(30),
  budget: z.coerce.number().positive().optional(),
});
