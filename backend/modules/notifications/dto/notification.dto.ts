import { z } from "zod";

export const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().email(),
});
