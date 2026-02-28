import type express from "express";
import { error, ok } from "../../../shared/responseFormatter";
import { CareService } from "../services/careService";
import type { CareProvider } from "../types/care.types";

export class CareController {
  constructor(private readonly service = new CareService()) {}

  health = async (_req: express.Request, res: express.Response) => {
    return res.json(ok(await this.service.health()));
  };

  logReferral = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
    }

    const provider = String(req.body?.provider ?? "nyaradzo").toLowerCase() as CareProvider;
    if (provider !== "nyaradzo") {
      return res.status(400).json(error("VALIDATION_ERROR", "Unsupported provider."));
    }

    const referral = await this.service.logReferral({ userId: Math.floor(userId), provider });
    return res.status(201).json(
      ok({
        message: "Care referral click logged.",
        referral_id: String(req.body?.referral_id ?? "").trim() || null,
        referral,
      })
    );
  };
}
