import type express from 'express';
import { error } from '../shared/responseFormatter';

type LimiterOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastBucketSweepAt = 0;

function maybeSweepExpiredBuckets(now: number, windowMs: number) {
  const minSweepIntervalMs = Math.max(1_000, Math.min(windowMs, 60_000));
  if (now - lastBucketSweepAt < minSweepIntervalMs) return;

  lastBucketSweepAt = now;
  buckets.forEach((bucket, key) => {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  });
}

export function rateLimiter(options: LimiterOptions) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    maybeSweepExpiredBuckets(now, options.windowMs);

    const ip = String(req.ip ?? req.socket.remoteAddress ?? 'unknown').trim();
    const key = `${options.keyPrefix}:${ip}`;
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
