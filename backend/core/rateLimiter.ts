import type express from 'express';
import { error } from '../shared/responseFormatter';

type LimiterOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  /** Key by authenticated user ID when available; falls back to IP. Default: false */
  keyByUser?: boolean;
};

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastBucketSweepAt = 0;

function resolveClientIp(req: express.Request): string {
  return String(req.ip ?? req.socket.remoteAddress ?? 'unknown').trim();
}

function resolveBucketSubject(req: express.Request, options: LimiterOptions): string {
  if (options.keyByUser) {
    const authUserId = Number((req as any)?.auth?.userId ?? 0);
    if (Number.isFinite(authUserId) && authUserId > 0) {
      return `user:${Math.floor(authUserId)}`;
    }
  }
  return `ip:${resolveClientIp(req)}`;
}

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

    const key = `${options.keyPrefix}:${resolveBucketSubject(req, options)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + options.windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(options.maxRequests - 1, 0)));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));
      return next();
    }

    bucket.count += 1;
    const remaining = Math.max(options.maxRequests - bucket.count, 0);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(bucket.resetAt / 1000)));

    if (bucket.count > options.maxRequests) {
      return res.status(429).json(error('RATE_LIMITED', 'Too many requests. Please try again later.'));
    }

    return next();
  };
}
