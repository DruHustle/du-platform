import type express from 'express';
import { z } from 'zod';
import { error } from './responseFormatter';

const IS_PRODUCTION = (process.env.NODE_ENV ?? 'development').toLowerCase() === 'production';

/** In production, strip internal field paths from Zod issues to avoid leaking schema details. */
function sanitizeZodIssues(issues: z.ZodIssue[]): Array<{ message: string; path?: (string | number)[] }> {
  if (IS_PRODUCTION) {
    return issues.map(({ message }) => ({ message }));
  }
  return issues.map(({ message, path }) => ({ message, path: path as (string | number)[] }));
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        error('VALIDATION_ERROR', 'Invalid request payload.', {
          issues: sanitizeZodIssues(parsed.error.issues),
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
          issues: sanitizeZodIssues(parsed.error.issues),
        })
      );
    }
    req.query = parsed.data as any;
    return next();
  };
}
