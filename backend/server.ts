import express from 'express';
import { registerCoreMiddleware } from './core/middleware';
import { errorHandler, notFoundHandler } from './core/errorHandler';
import { registerDomainModules } from './modules';

export function createModularServer() {
  const app = express();
  registerCoreMiddleware(app);
  registerDomainModules(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
