import { z } from "zod";

export const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().email(),
});

export const contactInquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  module: z.enum(["general", "technology", "export", "tourism", "investment", "data", "success"]).optional(),
});
