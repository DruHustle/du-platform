import type express from "express";
import { SearchService } from "../services/searchService";
import { ok } from "../../../shared/responseFormatter";
export class SearchController {
  constructor(private readonly service = new SearchService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
