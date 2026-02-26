import { z } from "zod";
export const tradeQuerySchema = z.object({ q: z.string().trim().optional() });
