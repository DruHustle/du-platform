import { AppError } from "../../../core/errorHandler";
import { ShopRequestError } from "../../../shared/persistence/shopStore";
import type express from "express";
import { ShopService, ShopServiceError } from "../services/shopService";
import { ok, error } from "../../../shared/responseFormatter";

export class ShopController {
  constructor(private readonly service = new ShopService()) {}

  private resolveOrderManageToken(req: express.Request): string {
    const fromHeader = String(req.headers["x-order-access-token"] ?? "").trim();
    if (fromHeader) return fromHeader;
    // Body only — query params are logged in server access logs and browser history
    if (
      typeof req.body?.manageToken === "string" &&
      req.body.manageToken.trim()
    ) {
      return req.body.manageToken.trim();
    }
    // Preserve GET order-status links/bookmarks. POST confirmation still requires header or body.
    if (req.method === "GET") {
      return String(req.query.manageToken ?? "").trim();
    }
    return "";
  }

  private sendError(
    res: express.Response,
    err: unknown,
    fallbackCode: string,
    fallbackMessage: string
  ) {
    if (err instanceof AppError)
      return res.status(err.statusCode).json(error(err.code, err.message));
    if (err instanceof ShopServiceError) {
      return res.status(err.status).json(error(err.code, err.message));
    }
    if (err instanceof ShopRequestError) {
      return res.status(err.status).json(error(fallbackCode, err.message));
    }
    console.error(`[shop] ${fallbackCode}: unexpected service failure`);
    return res.status(500).json(error(fallbackCode, fallbackMessage));
  }

  listProducts = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.listProducts(
        String(req.query.category ?? "")
      );
      return res.json(ok(data));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "SHOP_PRODUCTS_FAILED",
        "Unable to load products."
      );
    }
  };

  createRestockNotification = async (
    req: express.Request,
    res: express.Response
  ) => {
    try {
      const data = await this.service.createRestockNotification(req.body);
      return res.json(ok(data));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "SHOP_NOTIFY_FAILED",
        "Unable to save notify request."
      );
    }
  };

  createOrder = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.createOrder(req.body);
      return res.status(201).json(ok(data));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "SHOP_ORDER_CREATE_FAILED",
        "Unable to create order."
      );
    }
  };

  getOrder = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.getOrder(
        String(req.params.orderRef),
        this.resolveOrderManageToken(req)
      );
      return res.json(ok(data));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "SHOP_ORDER_LOAD_FAILED",
        "Unable to load order."
      );
    }
  };

  confirmPayment = async (req: express.Request, res: express.Response) => {
    try {
      const data = await this.service.confirmPayment(
        String(req.params.orderRef),
        String(req.body.paymentReference ?? ""),
        this.resolveOrderManageToken(req)
      );
      return res.json(ok(data));
    } catch (err) {
      return this.sendError(
        res,
        err,
        "SHOP_ORDER_CONFIRM_FAILED",
        "Unable to confirm payment."
      );
    }
  };
}
