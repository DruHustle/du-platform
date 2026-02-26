import { Router } from "express";
import { AdminController } from "../controllers/adminController";
import { validateAdminQuery } from "../validators";
export function createAdminModuleRouter() {
  const router = Router();
  const controller = new AdminController();
  router.get("/health", validateAdminQuery, controller.health);
  return router;
}
