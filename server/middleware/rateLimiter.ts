import type express from "express";
import { errorResponse } from "../utils/apiResponse";

type RateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function resolveClientIp(req: express.Request): string {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || "unknown";
}

export function createRateLimiter(options: RateLimiterOptions) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${resolveClientIp(req)}`;
    const existing = buckets.get(key);

    if (!existing || now >= existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
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
