import { AiAnalyticsTracker } from '../../shared/analyticsTracker';

const AR_DESTINATION_IDS = [
  "victoria_falls",
  "great_zimbabwe",
  "harare",
  "bulawayo",
  "hwange",
] as const;

const AR_PREVIEW_IMAGES = {
  victoria_falls: ["/images/pages/tourism/victoria_falls.jpg"],
  great_zimbabwe: ["/images/pages/tourism/great_zimbabwe.jpeg"],
  harare: ["/images/pages/tourism/balancing_rocks.jpg"],
  bulawayo: ["/images/pages/tourism/dest_matobo.jpg"],
  hwange: ["/images/pages/tourism/dest_hwange.png"],
} as const;

export class ArExperienceService {
  constructor(private readonly analytics = new AiAnalyticsTracker()) {}

  async getExperienceMetadata(input: { sessionId: string; userId?: number }) {
    this.analytics.track({ type: 'ar', sessionId: input.sessionId, userId: input.userId });
    return {
      mode: 'ar',
      destinationIds: [...AR_DESTINATION_IDS],
      previewImages: AR_PREVIEW_IMAGES,
      features: {
        geolocation: true,
        cameraGuide: true,
        voiceNarration: true,
        conversation: true,
        audioTranscription: true,
      },
      preload: true,
    };
  }
}
