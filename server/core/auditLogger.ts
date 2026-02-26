import { logger } from './logger';

export type AuditEvent = {
  actorId?: number | null;
  action: string;
  domain: string;
  resource?: string;
  metadata?: Record<string, unknown>;
};

export function audit(event: AuditEvent) {
  logger.info('audit_event', {
    domain: event.domain,
    action: event.action,
    actorId: event.actorId ?? null,
    resource: event.resource ?? null,
    metadata: event.metadata ?? {},
  });
}
