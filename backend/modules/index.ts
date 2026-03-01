import type express from 'express';
import { createAuthModuleRouter } from './auth/routes';
import { createFintechModuleRouter } from './fintech/routes';
import { createAiModuleRouter } from './ai/routes';
import { createShopModuleRouter } from './shop/routes';
import { createTourismModuleRouter } from './tourism/routes';
import { createTradeModuleRouter } from './trade/routes';
import { createInvestmentModuleRouter } from './investment/routes';
import { createCareModuleRouter } from './care/routes';
import { createSearchModuleRouter } from './search/routes';
import { createLegalModuleRouter } from './legal/routes';
import { createAdminModuleRouter } from './admin/routes';

export function registerDomainModules(app: express.Express) {
  app.use('/api/v2/auth', createAuthModuleRouter());
  app.use('/api/v2/tourism', createTourismModuleRouter());
  app.use('/api/v2/trade', createTradeModuleRouter());
  app.use('/api/v2/investment', createInvestmentModuleRouter());
  app.use('/api/v2/care', createCareModuleRouter());
  app.use('/api/v2/search', createSearchModuleRouter());
  app.use('/api/v2/legal', createLegalModuleRouter());
  app.use('/api/v2/admin', createAdminModuleRouter());
  app.use('/api/v2/fintech', createFintechModuleRouter());
  app.use('/api/v2/ai', createAiModuleRouter());
  app.use('/api/v2/shop', createShopModuleRouter());
}
