import { AiAnalyticsTracker } from '../../shared/analyticsTracker';

export class VrExperienceService {
  constructor(private readonly analytics = new AiAnalyticsTracker()) {}

  async getExperienceMetadata(input: { sessionId: string; userId?: number }) {
    this.analytics.track({ type: 'vr', sessionId: input.sessionId, userId: input.userId });
    return {
      mode: 'vr',
      scenes: ['living_room', 'music_room', 'office_small', 'office_large'],
      preload: true,
    };
  }
}
