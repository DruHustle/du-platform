import type express from 'express';
import { logger } from './logger';
import { error } from '../shared/responseFormatter';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Throw this for errors whose message is safe to return verbatim to the client.
 * Any other Error type is caught by controllers and replaced with a generic message.
 */
export class UserFacingError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = "UserFacingError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(_req: express.Request, res: express.Response) {
  return res.status(404).json(error('NOT_FOUND', 'Route not found.'));
}

export function errorHandler(
  err: unknown,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  const bodyError = err as { type?: string } | null;
  if (bodyError?.type === 'entity.parse.failed') {
    return res.status(400).json(error('INVALID_JSON', 'Request body must contain valid JSON.'));
  }
  if (bodyError?.type === 'entity.too.large') {
    return res.status(413).json(error('PAYLOAD_TOO_LARGE', 'Request body is too large.'));
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(error(err.code, err.message, err.details));
  }

  const message = err instanceof Error ? err.message : 'Unexpected server error';
  logger.error('Unhandled request error', {
    path: req.path,
    method: req.method,
    message,
    stack: err instanceof Error ? err.stack : undefined,
  });

  return res.status(500).json(error('INTERNAL_ERROR', 'Unexpected server error.'));
}
