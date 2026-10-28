import { z } from "./validation";
export const SHOP_READINESS_CHECKS = [
  "operator_identity",
  "procedures",
  "delivery",
  "product_facts",
  "unit_economics",
  "backup_restore",
  "transactional_email",
] as const;
export const shopPilotApprovalSchema = z
  .object({
    version: z.literal(1),
    market: z.literal("Europe"),
    currency: z.literal("EUR"),
    reviewedAt: z.string().datetime(),
    validUntil: z.string().datetime(),
    approvedBy: z.string().email().max(254),
    destinationCountries: z
      .array(
        z
          .object({
            code: z.string().regex(/^[A-Z]{2}$/),
            names: z.array(z.string().trim().min(2).max(80)).min(1).max(10),
          })
          .strict()
      )
      .min(1)
      .max(50),
    approvedProductIds: z.array(z.number().int().positive()).min(1).max(200),
    checks: z.record(
      z.enum(SHOP_READINESS_CHECKS),
      z
        .object({ approved: z.boolean(), evidence: z.string().trim().max(500) })
        .strict()
    ),
  })
  .strict();
export type ShopPilotApproval = z.infer<typeof shopPilotApprovalSchema>;
export type PublicShopReadiness = {
  mode: "observe" | "prelaunch" | "pilot";
  enforcement: "report_only" | "enforced";
  commercialReady: boolean;
  missing: string[];
  destinationCountries: string[];
  approvedProductIds?: number[];
};
