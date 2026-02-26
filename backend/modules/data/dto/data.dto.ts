import { z } from "zod";
export const dataQuerySchema = z.object({ q: z.string().trim().optional() });
