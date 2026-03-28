import { Router } from 'express';
import { RemittanceController } from '../controllers/remittanceController';
import { AirtimeController } from '../controllers/airtimeController';
import { GiftCardController } from '../controllers/giftCardController';
import { requireJwtAuth } from '../../../middleware/jwtAuth';
import { rateLimiter } from '../../../core/rateLimiter';
import {
  validateAirtimeLookup,
  validateAirtimeTopup,
  validateFxQuote,
  validateRemittance,
} from '../validators';
import { getFintechProviderRegistry } from '../providers/providerRegistry';
import { RemittanceService } from '../services/remittanceService';
import { AirtimeService } from '../services/airtimeService';

export function createFintechModuleRouter() {
  const router = Router();
  const providerRegistry = getFintechProviderRegistry();
  const remittance = new RemittanceController(
    new RemittanceService(providerRegistry.getRemittanceProvider())
  );
  const airtime = new AirtimeController(
    new AirtimeService(providerRegistry.getAirtimeProvider())
  );
  const giftCards = new GiftCardController();

  // Pricing/preview endpoints — no auth required; rate-limited by IP to prevent abuse.
  router.get('/remittance/config', remittance.config);
  router.post('/remittance/quote', rateLimiter({ keyPrefix: 'api:remittance:quote', windowMs: 60_000, maxRequests: 20 }), validateFxQuote, remittance.previewQuote);
  router.post('/remittance/send', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:send', windowMs: 60_000, maxRequests: 5, keyByUser: true }), validateRemittance, remittance.send);
  router.get('/remittance', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:list', windowMs: 60_000, maxRequests: 30, keyByUser: true }), remittance.listHistory);
  router.get('/remittance/:id', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:status', windowMs: 60_000, maxRequests: 60, keyByUser: true }), remittance.getStatus);
  router.post('/remittance/webhook', rateLimiter({ keyPrefix: 'api:remittance:webhook', windowMs: 60_000, maxRequests: 120 }), remittance.webhook);

  router.post('/airtime/operator/detect', rateLimiter({ keyPrefix: 'api:airtime:detect', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.detectOperator);
  router.post('/airtime/options', rateLimiter({ keyPrefix: 'api:airtime:options', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.options);
  router.post('/airtime/topup', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:topup', windowMs: 60_000, maxRequests: 10, keyByUser: true }), validateAirtimeTopup, airtime.topup);
  router.get('/airtime', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:list', windowMs: 60_000, maxRequests: 30, keyByUser: true }), airtime.listHistory);
  router.get('/airtime/:id', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:status', windowMs: 60_000, maxRequests: 60, keyByUser: true }), airtime.getStatus);
  router.post('/airtime/webhook', rateLimiter({ keyPrefix: 'api:airtime:webhook', windowMs: 60_000, maxRequests: 120 }), airtime.webhook);
  router.get('/gift-cards/catalog', rateLimiter({ keyPrefix: 'api:gift-cards:catalog', windowMs: 60_000, maxRequests: 30 }), giftCards.listCatalogue);

  return router;
}
