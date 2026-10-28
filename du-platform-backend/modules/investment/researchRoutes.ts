import { Router } from "express";
import { z } from "zod";
import { db } from "../../lib/databaseRuntime";
import projectRoutes from "../../contracts/investmentProjectRoutes.json";
import { ok, error } from "../../lib/responseFormatter";
const input = z
  .object({
    sources: z
      .array(
        z
          .string()
          .url()
          .max(1000)
          .refine(v => v.startsWith("https://"))
      )
      .max(10),
    reviewedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    status: z.enum(["unreviewed", "source_checked", "promoter_confirmed"]),
    promoterContact: z
      .string()
      .max(1000)
      .refine(
        v => !v || /^https:\/\//.test(v) || /^mailto:[^\s@]+@[^\s@]+$/.test(v)
      ),
    nextStep: z.string().trim().max(2000),
  })
  .superRefine((v, ctx) => {
    if (
      v.status !== "unreviewed" &&
      (!v.sources.length ||
        !v.reviewedAt ||
        v.reviewedAt > new Date().toISOString().slice(0, 10) ||
        !Number.isFinite(new Date(v.reviewedAt + "T00:00:00Z").getTime()) ||
        new Date(v.reviewedAt + "T00:00:00Z").toISOString().slice(0, 10) !==
          v.reviewedAt)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Reviewed profiles require primary-source links and a valid review date.",
      });
    if (v.status === "promoter_confirmed" && !v.promoterContact)
      ctx.addIssue({
        code: "custom",
        message: "Confirmed promoter contact is required.",
      });
  });
export function createResearchRouter(admin = false) {
  const r = Router();
  r.get("/:kind/:key", async (req, res) => {
    try {
      if (!db) return res.sendStatus(503);
      const [rows] = await db.query<any[]>(
        "SELECT details FROM research_profiles WHERE kind=? AND subject_key=?",
        [req.params.kind, req.params.key]
      );
      res.json(ok({ profile: rows[0] ? JSON.parse(rows[0].details) : null }));
    } catch {
      res.sendStatus(503);
    }
  });
  if (admin)
    r.put("/:kind/:key", async (req, res) => {
      try {
        const profile = input.safeParse(req.body);
        if (!profile.success)
          return res
            .status(400)
            .json(
              error(
                "RESEARCH_INVALID",
                "Check source URLs, status, review date and confirmed contact."
              )
            );
        if (!db) return res.sendStatus(503);
        const { kind, key } = req.params;
        if (kind === "project" && !Object.hasOwn(projectRoutes, key))
          return res.sendStatus(404);
        if (kind === "ntir") {
          const [rows] = await db.query<any[]>(
            "SELECT id FROM ntir_entities WHERE id=?",
            [key]
          );
          if (!rows.length) return res.sendStatus(404);
        } else if (kind !== "project") return res.sendStatus(400);
        await db.execute(
          "INSERT INTO research_profiles (kind,subject_key,details) VALUES (?,?,?) ON DUPLICATE KEY UPDATE details=VALUES(details)",
          [kind, key, JSON.stringify(profile.data)]
        );
        res.json(ok({ profile: profile.data }));
      } catch {
        res.sendStatus(503);
      }
    });
  return r;
}
