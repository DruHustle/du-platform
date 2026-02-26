import { Router } from "express";
import { DataController } from "../controllers/dataController";
import { validateDataQuery } from "../validators";
export function createDataModuleRouter() {
  const router = Router();
  const controller = new DataController();
  router.get("/health", validateDataQuery, controller.health);
  return router;
}
