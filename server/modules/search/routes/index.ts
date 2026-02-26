import { Router } from "express";
import { SearchController } from "../controllers/searchController";
import { validateSearchQuery } from "../validators";
export function createSearchModuleRouter() {
  const router = Router();
  const controller = new SearchController();
  router.get("/health", validateSearchQuery, controller.health);
  return router;
}
