import type express from "express";
import { AdminService } from "../services/adminService";
import { ok } from "../../../shared/responseFormatter";
export class AdminController {
  constructor(private readonly service = new AdminService()) {}
  health = async (_req: express.Request, res: express.Response) => res.json(ok(await this.service.health()));
}
