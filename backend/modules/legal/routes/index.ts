import { Router } from "express";
import { LegalController } from "../controllers/legalController";
import { validateLegalQuery } from "../validators";
export function createLegalModuleRouter() {
  const router = Router();
  const controller = new LegalController();
  router.get("/health", validateLegalQuery, controller.health);
  return router;
}
