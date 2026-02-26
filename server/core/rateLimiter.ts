import type express from 'express';
import { error } from '../shared/responseFormatter';

type LimiterOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(options: LimiterOptions) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = String(req.headers['x-forwarded-for'] ?? req.ip ?? 'unknown').split(',')[0].trim();
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.maxRequests) {
      return res.status(429).json(error('RATE_LIMITED', 'Too many requests. Please try again later.'));
    }

    bucket.count += 1;
    return next();
  };
}
