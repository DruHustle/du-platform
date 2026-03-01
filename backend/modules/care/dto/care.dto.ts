import { z } from "zod";

export const careReferralSchema = z.object({
  provider: z.literal("nyaradzo").default("nyaradzo"),
  referral_id: z.string().trim().max(120).optional().nullable(),
});
