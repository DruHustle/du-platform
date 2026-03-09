import type express from "express";
import { UtilityService } from "../services/utilityService";
import { ok, error } from "../../../shared/responseFormatter";

const SYSTEM_NOTICE =
  "Payments are powered by licensed financial infrastructure providers. Diaspora Unlocked does not hold customer funds.";

export class UtilityController {
  constructor(private readonly service = new UtilityService()) {}

  options = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error("UNAUTHORIZED", "Authentication required."));

    try {
      const result = await this.service.electricityOptions(userId, req.body);
      return res.json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res
        .status(400)
        .json(error("UTILITY_OPTIONS_FAILED", err instanceof Error ? err.message : "Electricity options failed."));
    }
  };

  pay = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    if (!userId) return res.status(401).json(error("UNAUTHORIZED", "Authentication required."));

    try {
      const result = await this.service.payElectricity(userId, req.body);
      return res.status(201).json(ok({ ...result, systemNotice: SYSTEM_NOTICE }));
    } catch (err) {
      return res
        .status(400)
        .json(error("UTILITY_PAYMENT_FAILED", err instanceof Error ? err.message : "Electricity payment failed."));
    }
  };

  getStatus = async (req: express.Request, res: express.Response) => {
    const userId = Number(req.auth?.userId ?? 0);
    const transactionId = Number(req.params.id);
    if (!userId) return res.status(401).json(error("UNAUTHORIZED", "Authentication required."));
    if (!Number.isFinite(transactionId) || transactionId <= 0) {
      return res.status(400).json(error("INVALID_ID", "Invalid transaction id."));
    }

    const transaction = await this.service.getElectricityStatus(userId, Math.floor(transactionId));
    if (!transaction) return res.status(404).json(error("NOT_FOUND", "Transaction not found."));

    return res.json(ok({ transaction, systemNotice: SYSTEM_NOTICE }));
  };
}
