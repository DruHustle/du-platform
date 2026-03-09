import { Router } from 'express';
import { RemittanceController } from '../controllers/remittanceController';
import { AirtimeController } from '../controllers/airtimeController';
import { UtilityController } from '../controllers/utilityController';
import { requireJwtAuth } from '../../../middleware/jwtAuth';
import { rateLimiter } from '../../../core/rateLimiter';
import {
  validateAirtimeLookup,
  validateAirtimeTopup,
  validateElectricityOptions,
  validateElectricityPayment,
  validateFxQuote,
  validateRemittance,
} from '../validators';

export function createFintechModuleRouter() {
  const router = Router();
  const remittance = new RemittanceController();
  const airtime = new AirtimeController();
  const utility = new UtilityController();

  router.post('/remittance/quote', rateLimiter({ keyPrefix: 'api:remittance:quote', windowMs: 60_000, maxRequests: 20 }), validateFxQuote, remittance.previewQuote);
  router.post('/remittance/send', requireJwtAuth, rateLimiter({ keyPrefix: 'api:remittance:send', windowMs: 60_000, maxRequests: 5 }), validateRemittance, remittance.send);
  router.get('/remittance/:id', requireJwtAuth, remittance.getStatus);

  router.post('/airtime/operator/detect', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:detect', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.detectOperator);
  router.post('/airtime/options', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:options', windowMs: 60_000, maxRequests: 30 }), validateAirtimeLookup, airtime.options);
  router.post('/airtime/topup', requireJwtAuth, rateLimiter({ keyPrefix: 'api:airtime:topup', windowMs: 60_000, maxRequests: 10 }), validateAirtimeTopup, airtime.topup);
  router.get('/airtime/:id', requireJwtAuth, airtime.getStatus);

  router.post('/utility/electricity/options', requireJwtAuth, rateLimiter({ keyPrefix: 'api:utility:electricity:options', windowMs: 60_000, maxRequests: 20 }), validateElectricityOptions, utility.options);
  router.post('/utility/electricity/pay', requireJwtAuth, rateLimiter({ keyPrefix: 'api:utility:electricity:pay', windowMs: 60_000, maxRequests: 10 }), validateElectricityPayment, utility.pay);
  router.get('/utility/:id', requireJwtAuth, utility.getStatus);

  return router;
}
