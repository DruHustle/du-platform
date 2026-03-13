import { Router } from 'express';
import { RemittanceController } from '../controllers/remittanceController';
import { AirtimeController } from '../controllers/airtimeController';
import { requireJwtAuth } from '../../../middleware/jwtAuth';
import { rateLimiter } from '../../../core/rateLimiter';
import {
  validateAirtimeLookup,
  validateAirtimeTopup,
  validateFxQuote,
  validateRemittance,
} from '../validators';

export function createFintechModuleRouter() {
  const router = Router();
  const remittance = new RemittanceController();
  const airtime = new AirtimeController();

  // Pricing/preview endpoints — no auth required; rate-limited by IP to prevent abuse.
  router.post('/remittance/quote', rateLimiter({ keyPrefix: 'api:remittance:quote', windowMs: 60_000, maxRequests: 20 }), validateFxQuote, remittance.previewQuote);
  router.post('/remittance/send', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:send', windowMs: 60_000, maxRequests: 5 }), validateRemittance, remittance.send);
  router.get('/remittance/:id', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:status', windowMs: 60_000, maxRequests: 60 }), remittance.getStatus);

  router.post('/airtime/operator/detect', rateLimiter({ keyPrefix: 'api:airtime:detect', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.detectOperator);
  router.post('/airtime/options', rateLimiter({ keyPrefix: 'api:airtime:options', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.options);
  router.post('/airtime/topup', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:topup', windowMs: 60_000, maxRequests: 10 }), validateAirtimeTopup, airtime.topup);
  router.get('/airtime/:id', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:status', windowMs: 60_000, maxRequests: 60 }), airtime.getStatus);

  return router;
}
