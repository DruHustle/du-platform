import type express from "express";
import { DataService } from "../services/dataService";
import { ok } from "../../../shared/responseFormatter";
export class DataController {
  constructor(private readonly service = new DataService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
