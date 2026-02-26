import type express from "express";
import { errorResponse } from "../utils/apiResponse";

type RateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  keyByUser?: boolean;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
let lastBucketSweepAt = 0;

function resolveClientIp(req: express.Request): string {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || "unknown";
}

function resolveBucketSubject(req: express.Request, options: RateLimiterOptions): string {
  const keyByUser = options.keyByUser !== false;
  const authUserId = Number((req as any)?.auth?.userId ?? 0);
  if (keyByUser && Number.isFinite(authUserId) && authUserId > 0) {
    return `user:${Math.floor(authUserId)}`;
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

export function createRateLimiter(options: RateLimiterOptions) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    maybeSweepExpiredBuckets(now, options.windowMs);

    const key = `${options.keyPrefix}:${resolveBucketSubject(req, options)}`;
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      const resetAt = now + options.windowMs;
      buckets.set(key, { count: 1, resetAt });
      res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(options.maxRequests - 1, 0)));
      res.setHeader("X-RateLimit-Reset", String(Math.floor(resetAt / 1000)));
      return next();
    }

    existing.count += 1;
    const remaining = Math.max(options.maxRequests - existing.count, 0);
    res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.floor(existing.resetAt / 1000)));

    if (existing.count > options.maxRequests) {
      return res
        .status(429)
        .json(errorResponse("RATE_LIMITED", "Too many requests. Please retry shortly."));
    }

    return next();
  };
}
