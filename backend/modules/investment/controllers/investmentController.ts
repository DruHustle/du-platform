import type express from "express";
import { InvestmentService } from "../services/investmentService";
import { ok } from "../../../shared/responseFormatter";
export class InvestmentController {
  constructor(private readonly service = new InvestmentService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
