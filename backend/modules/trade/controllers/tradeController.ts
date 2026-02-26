import type express from "express";
import { TradeService } from "../services/tradeService";
import { ok } from "../../../shared/responseFormatter";
export class TradeController {
  constructor(private readonly service = new TradeService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
