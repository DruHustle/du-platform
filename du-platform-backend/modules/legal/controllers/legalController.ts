import type express from "express";
import { LegalService } from "../services/legalService";
import { ok } from "../../../shared/responseFormatter";
export class LegalController {
  constructor(private readonly service = new LegalService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
