import type express from 'express';
import { z } from 'zod';
import { error } from './responseFormatter';

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        error('VALIDATION_ERROR', 'Invalid request payload.', {
          issues: parsed.error.issues,
        })
      );
    }
    req.body = parsed.data;
    return next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        error('VALIDATION_ERROR', 'Invalid request query.', {
          issues: parsed.error.issues,
        })
      );
    }
    req.query = parsed.data as any;
    return next();
  };
}
