import { AiAnalyticsTracker } from '../../shared/analyticsTracker';

export class ArExperienceService {
  constructor(private readonly analytics = new AiAnalyticsTracker()) {}

  async getExperienceMetadata(input: { sessionId: string; userId?: number }) {
    this.analytics.track({ type: 'ar', sessionId: input.sessionId, userId: input.userId });
    return {
      mode: 'ar',
      assets: ['victoria-falls.glb', 'great-zimbabwe.glb'],
      preload: true,
    };
  }
}
