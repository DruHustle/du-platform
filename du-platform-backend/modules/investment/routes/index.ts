import { createResearchRouter } from "../researchRoutes";
import { Router } from "express";
import { InvestmentController } from "../controllers/investmentController";
import { validateInvestmentQuery } from "../validators";
export function createInvestmentModuleRouter() {
  const router = Router();
  const controller = new InvestmentController();
  router.use("/research", createResearchRouter());
  router.get("/ntir/search", validateInvestmentQuery, controller.searchNtir);
  return router;
}
