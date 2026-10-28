import type express from "express";
import { getAdminAuthUser } from "../../../lib/admin";
import { error, ok } from "../../../lib/responseFormatter";
import { AdminService, AdminServiceError } from "../services/adminService";

export class AdminController {
  constructor(private readonly service = new AdminService()) {}

  private sendError(
    res: express.Response,
    err: unknown,
    fallbackCode: string,
    fallbackMessage: string
  ) {
    if (err instanceof AdminServiceError) {
      return res.status(err.status).json(error(err.code, err.message));
    }

    if (fallbackCode.startsWith("SHOP_PRODUCT") && (err as { code?: string })?.code === "ER_DUP_ENTRY")
      return res
        .status(409)
        .json(
          error(
            "SHOP_PRODUCT_EXISTS",
            "This product URL key is already in use. Choose another key."
          )
        );
    if (
      fallbackCode.startsWith("SHOP_PRODUCT") && ["ER_ROW_IS_REFERENCED_2", "ER_ROW_IS_REFERENCED"].includes(
        String((err as { code?: string })?.code)
      )
    )
      return res
        .status(409)
        .json(
          error(
            "SHOP_PRODUCT_IN_USE",
            "This product has order history. Hide it instead of deleting it."
          )
        );
    return res.status(500).json(error(fallbackCode, fallbackMessage));
  }

  overview = async (_req: express.Request, res: express.Response) => {
    try {
      const authUser = getAdminAuthUser(res);
      if (!authUser) return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
      return res.json(ok(await this.service.getOverview(authUser)));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_OVERVIEW_FAILED", "Unable to load admin overview.");
    }
  };

  getNotificationSettings = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.getNotificationSettings()));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "ADMIN_NOTIFICATION_SETTINGS_FAILED",
        "Unable to load notification settings."
      );
    }
  };

  updateNotificationSettings = async (req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.updateNotificationSettings(req.body ?? {})));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "ADMIN_NOTIFICATION_SETTINGS_UPDATE_FAILED",
        "Unable to save notification settings."
      );
    }
  };

  listNotifyRequests = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.listNotifyRequests()));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "ADMIN_NOTIFY_REQUESTS_FAILED",
        "Unable to load notify requests."
      );
    }
  };

  listNtirEntries = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.listNtirEntries()));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_NTIR_LOAD_FAILED", "Unable to load NTIR entries.");
    }
  };

  createNtirEntry = async (req: express.Request, res: express.Response) => {
    try {
      return res.status(201).json(ok(await this.service.createNtirEntry(req.body ?? {})));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_NTIR_CREATE_FAILED", "Unable to create NTIR entry.");
    }
  };

  updateNtirEntry = async (req: express.Request, res: express.Response) => {
    try {
      const id = Number(req.params.id);
      return res.json(ok(await this.service.updateNtirEntry(id, req.body ?? {})));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_NTIR_UPDATE_FAILED", "Unable to update NTIR entry.");
    }
  };

  listImpactStories = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.listImpactStories()));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_IMPACT_LOAD_FAILED", "Unable to load impact stories.");
    }
  };

  createImpactStory = async (req: express.Request, res: express.Response) => {
    try {
      return res.status(201).json(ok(await this.service.createImpactStory(req.body ?? {})));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_IMPACT_CREATE_FAILED", "Unable to create impact story.");
    }
  };

  updateImpactStory = async (req: express.Request, res: express.Response) => {
    try {
      const id = Number(req.params.id);
      return res.json(ok(await this.service.updateImpactStory(id, req.body ?? {})));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_IMPACT_UPDATE_FAILED", "Unable to update impact story.");
    }
  };

  listShopProducts = async (_req: express.Request, res: express.Response) => {
    try {
      return res.json(ok(await this.service.listShopProducts()));
    } catch (err) {
      return this.sendError(res, err, "ADMIN_SHOP_PRODUCTS_FAILED", "Unable to load shop products.");
    }
  };

  createShopProduct = async (req: express.Request, res: express.Response) => {
    try {
      return res.status(201).json(ok(await this.service.createShopProduct(req.body ?? {})));
    } catch (err) {
      return this.sendError(res, err, "SHOP_PRODUCT_CREATE_FAILED", "Unable to create product.");
    }
  };

  updateShopProduct = async (req: express.Request, res: express.Response) => {
    try {
      const authUser = getAdminAuthUser(res);
      if (!authUser) return res.status(401).json(error("AUTH_UNAUTHORIZED", "Unauthorized."));
      const id = Number(req.params.id);
      return res.json(ok(await this.service.updateShopProduct(id, req.body ?? {}, authUser.email)));
    } catch (err) {
      return this.sendError(res, err, "SHOP_PRODUCT_UPDATE_FAILED", "Unable to update product.");
    }
  };

  deleteShopProduct = async (req: express.Request, res: express.Response) => {
    try {
      const id = Number(req.params.id);
      return res.json(ok(await this.service.deleteShopProduct(id)));
    } catch (err) {
      return this.sendError(res, err, "SHOP_PRODUCT_DELETE_FAILED", "Unable to delete product.");
    }
  };
}
