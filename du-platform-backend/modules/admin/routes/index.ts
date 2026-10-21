import { createNewsletterAdminRouter } from "../../newsletter/routes";
import { Router } from "express";
import { requireJwtAuth } from "../../../middleware/jwtAuth";
import { requireAdminAuth } from "../../../shared/admin";
import { AdminController } from "../controllers/adminController";

export function createAdminModuleRouter() {
  const router = Router();
  const controller = new AdminController();

  router.use(requireJwtAuth, requireAdminAuth);
  router.use("/newsletter", createNewsletterAdminRouter());
  router.get("/overview", controller.overview);
  router.get("/notification-settings", controller.getNotificationSettings);
  router.put("/notification-settings", controller.updateNotificationSettings);
  router.get("/notify-requests", controller.listNotifyRequests);
  router.get("/ntir", controller.listNtirEntries);
  router.post("/ntir", controller.createNtirEntry);
  router.put("/ntir/:id", controller.updateNtirEntry);
  router.get("/impact", controller.listImpactStories);
  router.post("/impact", controller.createImpactStory);
  router.put("/impact/:id", controller.updateImpactStory);
  router.get("/shop-products", controller.listShopProducts);
  router.post("/shop-products", controller.createShopProduct);
  router.put("/shop-products/:id", controller.updateShopProduct);
  router.delete("/shop-products/:id", controller.deleteShopProduct);

  return router;
}
