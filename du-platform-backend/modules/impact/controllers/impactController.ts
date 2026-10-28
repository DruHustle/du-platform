import type express from "express";
import { error, ok } from "../../../lib/responseFormatter";
import { ImpactService } from "../services/impactService";

export class ImpactController {
  constructor(private readonly service = new ImpactService()) {}

  listStories = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.listStories()));
    } catch {
      return res.status(500).json(error("IMPACT_LOAD_FAILED", "Unable to load impact stories."));
    }
  };
}
