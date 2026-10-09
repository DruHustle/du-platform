import type express from 'express';
import { error } from '../shared/responseFormatter';
import { db } from '../shared/databaseRuntime';

type LimiterOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  /** Key by authenticated user ID when available; falls back to IP. Default: false */
  keyByUser?: boolean;
};

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastBucketSweepAt = 0;
let lastPersistentSweepAt = 0;

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

async function maybeSweepExpiredPersistentBuckets(now: number, windowMs: number) {
  if (!db) return;

  const minSweepIntervalMs = Math.max(5_000, Math.min(windowMs, 60_000));
  if (now - lastPersistentSweepAt < minSweepIntervalMs) return;

  lastPersistentSweepAt = now;
  await db.execute(
    "DELETE FROM rate_limit_buckets WHERE reset_at <= ? LIMIT 1000",
    [now]
  );
}

async function consumePersistentBucket(key: string, options: LimiterOptions, now: number) {
  if (!db) return null;

  await maybeSweepExpiredPersistentBuckets(now, options.windowMs);
  const resetAt = now + options.windowMs;

  // Use a dedicated connection so LAST_INSERT_ID() is connection-scoped and
  // cannot be clobbered by a concurrent request on a different pool connection.
  // This makes the count read atomic: we always read OUR own incremented value.
  const conn = await db.getConnection();
  try {
    await conn.execute(
      `
      INSERT INTO rate_limit_buckets (bucket_key, request_count, reset_at)
      VALUES (?, LAST_INSERT_ID(1), ?)
      ON DUPLICATE KEY UPDATE
        request_count = IF(reset_at <= ?, LAST_INSERT_ID(1), LAST_INSERT_ID(request_count + 1)),
        reset_at = IF(reset_at <= ?, ?, reset_at),
        updated_at = CURRENT_TIMESTAMP
      `,
      [key, resetAt, now, now, resetAt]
    );

    const [rows] = await conn.query<any[]>(
      "SELECT LAST_INSERT_ID() AS request_count, reset_at FROM rate_limit_buckets WHERE bucket_key = ? LIMIT 1",
      [key]
    );
    const row = rows[0];
    if (!row) return null;

    return {
      count: Number(row.request_count ?? 0),
      resetAt: Number(row.reset_at ?? resetAt),
    };
  } finally {
    conn.release();
  }
}

export function rateLimiter(options: LimiterOptions) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${resolveBucketSubject(req, options)}`;

    try {
      const persistentBucket = await consumePersistentBucket(key, options, now);
      if (persistentBucket) {
        const remaining = Math.max(options.maxRequests - persistentBucket.count, 0);
        res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.floor(persistentBucket.resetAt / 1000)));

        if (persistentBucket.count > options.maxRequests) {
          const retryAfterSecs = Math.max(1, Math.ceil((persistentBucket.resetAt - now) / 1000));
          res.setHeader('Retry-After', String(retryAfterSecs));
          return res.status(429).json(error('RATE_LIMITED', 'Too many requests. Please try again later.'));
        }

        return next();
      }
    } catch {
      // Fall back to in-process buckets if the shared store is temporarily unavailable.
    }

    maybeSweepExpiredBuckets(now, options.windowMs);
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
      const retryAfterSecs = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSecs));
      return res.status(429).json(error('RATE_LIMITED', 'Too many requests. Please try again later.'));
    }

    return next();
  };
}
