import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import crypto from 'crypto';
import { logger } from './logger';
import { loadConfig } from './config';

export function registerCoreMiddleware(app: Express) {
  const config = loadConfig();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((req, _res, next) => {
    (req as any).requestId = crypto.randomUUID();
    next();
  });

  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      logger.info('request_completed', {
        requestId: (req as any).requestId,
        method: req.method,
        path: req.path,
        status: _res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Idempotency-Key'],
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const token = String(req.headers['x-csrf-token'] ?? '').trim();
    const csrfDisabled = (process.env.CSRF_ENABLED ?? 'false').toLowerCase() !== 'true';
    if (csrfDisabled) return next();
    if (!token) return res.status(403).json({ success: false, data: null, error: { code: 'CSRF_REQUIRED', message: 'Missing CSRF token.' } });
    return next();
  });
}
