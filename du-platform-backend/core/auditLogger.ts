import { logger } from "./logger";
import { db } from "../lib/databaseRuntime";

export type AuditEvent = {
  actorId?: number | null;
  action: string;
  domain: string;
  resource?: string;
  metadata?: Record<string, unknown>;
};

// Domains where a failed audit write is business-critical and must be surfaced
// loudly so that operators know the audit trail has a gap.
const CRITICAL_AUDIT_DOMAINS = new Set(["auth"]);

export async function appendAuditEvent(event: AuditEvent) {
  logger.info("audit_event", {
    domain: event.domain,
    action: event.action,
    actorId: event.actorId ?? null,
    resource: event.resource ?? null,
    metadata: event.metadata ?? {},
  });

  if (!db) return;

  try {
    await db.execute(
      `
      INSERT INTO audit_events (domain, action, actor_id, resource, metadata_json)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        event.domain,
        event.action,
        event.actorId ?? null,
        event.resource ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ]
    );
  } catch (error) {
    logger.error("audit_event_persist_failed", {
      domain: event.domain,
      action: event.action,
      message: error instanceof Error ? error.message : String(error),
    });

    if (CRITICAL_AUDIT_DOMAINS.has(event.domain)) {
      // Log at WARN level with a distinct key so monitoring/alerting rules can
      // catch audit trail gaps in regulated domains without needing to parse
      // the general error stream.
      logger.warn("audit_trail_gap_critical", {
        domain: event.domain,
        action: event.action,
        resource: event.resource ?? null,
        actorId: event.actorId ?? null,
        note: "Audit record could not be persisted. Manual reconciliation may be required.",
      });
    }
  }
}

export function audit(event: AuditEvent) {
  void appendAuditEvent(event);
}
