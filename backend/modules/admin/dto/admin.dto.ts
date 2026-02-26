import { z } from "zod";
export const adminQuerySchema = z.object({ q: z.string().trim().optional() });
