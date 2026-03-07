import type express from 'express';
import { createAuthModuleRouter } from './auth/routes';
import { createFintechModuleRouter } from './fintech/routes';
import { registerAiModule } from './ai/routes';
import { createShopModuleRouter } from './shop/routes';
import { createTourismModuleRouter } from './tourism/routes';
import { createTradeModuleRouter } from './trade/routes';
import { createInvestmentModuleRouter } from './investment/routes';
import { createImpactModuleRouter } from './impact/routes';
import { createCareModuleRouter } from './care/routes';
import { createSearchModuleRouter } from './search/routes';
import { createLegalModuleRouter } from './legal/routes';
import { createAdminModuleRouter } from './admin/routes';
import { createNotificationsModuleRouter } from './notifications/routes';

export function registerDomainModules(app: express.Express) {
  app.use('/api/auth', createAuthModuleRouter());
  app.use('/api/tourism', createTourismModuleRouter());
  app.use('/api/trade', createTradeModuleRouter());
  app.use('/api/investment', createInvestmentModuleRouter());
  app.use('/api/impact', createImpactModuleRouter());
  app.use('/api/care', createCareModuleRouter());
  app.use('/api/search', createSearchModuleRouter());
  app.use('/api/legal', createLegalModuleRouter());
  app.use('/api/admin', createAdminModuleRouter());
  app.use('/api/notifications', createNotificationsModuleRouter());
  app.use('/api/fintech', createFintechModuleRouter());
  registerAiModule(app);
  app.use('/api/shop', createShopModuleRouter());
}
