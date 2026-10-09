import type express from "express";
import { error, ok } from "../../../shared/responseFormatter";
import { InvestmentService } from "../services/investmentService";

export class InvestmentController {
  constructor(private readonly service = new InvestmentService()) {}

  searchNtir = async (req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.searchNtir(String(req.query.q ?? ""))));
    } catch {
      return res.status(500).json(error("NTIR_SEARCH_FAILED", "Unable to search NTIR database."));
    }
  };
}
