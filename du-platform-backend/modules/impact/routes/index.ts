import { Router } from "express";
import { ImpactController } from "../controllers/impactController";

export function createImpactModuleRouter() {
  const router = Router();
  const controller = new ImpactController();

  router.get("/stories", controller.listStories);

  return router;
}
