import type express from 'express';
import { error } from '../shared/responseFormatter';

export type Role = 'user' | 'admin' | 'partner';

export function requireRole(allowed: Role[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const role = String((req as any).auth?.claims?.role ?? 'user') as Role;
    if (!allowed.includes(role)) {
      return res.status(403).json(error('FORBIDDEN', 'You do not have access to this resource.'));
    }
    return next();
  };
}
