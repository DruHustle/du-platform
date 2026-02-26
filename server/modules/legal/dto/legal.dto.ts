import { z } from "zod";
export const legalQuerySchema = z.object({ q: z.string().trim().optional() });
