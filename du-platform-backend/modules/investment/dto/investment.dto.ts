import { z } from "zod";
export const investmentQuerySchema = z.object({ q: z.string().trim().optional() });
