import type express from "express";
import { error, ok } from "../../../shared/responseFormatter";
import { GiftCardService } from "../services/giftCardService";

export class GiftCardController {
  constructor(private readonly service = new GiftCardService()) {}

  listCatalogue = async (req: express.Request, res: express.Response) => {
    try {
      const countryCode = String(req.query.countryCode ?? "ZW").trim().toUpperCase() || "ZW";
      return res.json(ok(await this.service.listCatalogue(countryCode)));
    } catch {
      return res.status(500).json(error("GIFT_CARDS_CATALOGUE_FAILED", "Unable to retrieve the gift card catalogue right now."));
    }
  };
}
