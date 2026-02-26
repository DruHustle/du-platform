import type express from "express";
import { createAirtimeRouter } from "./airtimeRoutes";
import { createRemittanceRouter } from "./remittanceRoutes";

export function registerFinancialRoutes(app: express.Express) {
  app.use("/api/remittance", createRemittanceRouter());
  app.use("/api/airtime", createAirtimeRouter());
}
