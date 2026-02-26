import { audit } from '../../../core/auditLogger';

export class AiAnalyticsTracker {
  track(event: {
    type: 'chat' | 'booking' | 'ar' | 'vr';
    sessionId: string;
    userId?: number;
    metadata?: Record<string, unknown>;
  }) {
    audit({
      domain: 'ai',
      action: event.type,
      actorId: event.userId ?? null,
      resource: event.sessionId,
      metadata: event.metadata,
    });
  }
}
