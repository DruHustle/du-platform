import { buildTripPlanningPrompt } from '../../shared/promptTemplates';
import { AiAnalyticsTracker } from '../../shared/analyticsTracker';

export class BookingService {
  constructor(private readonly analytics = new AiAnalyticsTracker()) {}

  async buildTripPlan(input: {
    sessionId: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget?: number;
    userId?: number;
  }) {
    const prompt = buildTripPlanningPrompt(input);

    this.analytics.track({
      type: 'booking',
      sessionId: input.sessionId,
      userId: input.userId,
      metadata: { prompt },
    });

    return {
      summary: `Trip plan for ${input.destination}`,
      prompt,
      recommendations: [
        'Confirm passport and visa windows early.',
        'Book accommodation with flexible cancellation.',
        'Pre-plan transport between destinations.',
      ],
    };
  }
}
