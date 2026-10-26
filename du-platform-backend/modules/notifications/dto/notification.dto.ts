import { z } from "zod";

export const contactInquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  requestId: z.string().uuid(),
  language: z.enum(["en", "de", "sn", "nd"]).default("en"),
  email: z.string().trim().max(254).email().toLowerCase(),
  phone: z.string().trim().max(30).default(""),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  module: z
    .enum([
      "general",
      "technology",
      "export",
      "tourism",
      "investment",
      "data",
      "success",
    ])
    .default("general"),
});
