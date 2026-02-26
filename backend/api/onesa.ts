import type express from "express";
import { registerOnesaAIRoutes } from "../onesaAI";

export type OnesaApiDeps = Parameters<typeof registerOnesaAIRoutes>[1];

export function registerOnesaApiRoutes(app: express.Express, deps: OnesaApiDeps) {
  registerOnesaAIRoutes(app, deps);
}
