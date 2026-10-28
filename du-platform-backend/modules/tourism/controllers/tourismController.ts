import type express from "express";
import { TourismService } from "../services/tourismService";
import { ok } from "../../../lib/responseFormatter";
export class TourismController {
  constructor(private readonly service = new TourismService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
