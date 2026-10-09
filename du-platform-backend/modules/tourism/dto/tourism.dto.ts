import { z } from "zod";
export const tourismQuerySchema = z.object({ q: z.string().trim().optional() });
