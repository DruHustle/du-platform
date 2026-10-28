import type express from "express";
import { error, ok } from "../../../lib/responseFormatter";
import { SearchService } from "../services/searchService";

export class SearchController {
  constructor(private readonly service = new SearchService()) {}

  search = async (req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.search(String(req.query.q ?? ""))));
    } catch {
      return res.status(500).json(error("SEARCH_FAILED", "Unable to run search right now."));
    }
  };
}
