import { Router } from "express";
import { TourismController } from "../controllers/tourismController";
import { validateTourismQuery } from "../validators";
export function createTourismModuleRouter() {
  const router = Router();
  const controller = new TourismController();
  router.get("/health", validateTourismQuery, controller.health);
  return router;
}
