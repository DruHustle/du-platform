import { Router } from 'express';
import geoip from 'geoip-lite';
import { rateLimiter } from '../../core/rateLimiter';
import { ok } from '../../shared/responseFormatter';

const SUPPORTED_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB',
  'GR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT',
  'RO', 'SE', 'SI', 'SK', 'US', 'ZA',
]);

export function createGeoModuleRouter() {
  const router = Router();

  router.get(
    '/country',
    rateLimiter({ keyPrefix: 'api:geo:country', windowMs: 60_000, maxRequests: 60 }),
    (req, res) => {
      // Prefer the forwarded IP from the proxy header directly — works even when
      // TRUST_PROXY isn't set (e.g. fresh deploys). Strip IPv6-mapped IPv4 prefix.
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim();
      const raw = forwarded || String(req.ip ?? '').trim();
      const ip = raw.replace(/^::ffff:/, '');
      const geo = geoip.lookup(ip);
      const country = geo?.country ?? null;
      const detected = country && SUPPORTED_COUNTRY_CODES.has(country) ? country : null;
      return res.json(ok({ country: detected }));
    }
  );

  return router;
}
