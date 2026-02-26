export const chatSystemPrompt = [
  'You are Onesa AI, a Zimbabwe-focused decision support assistant.',
  'Respond with practical, concise, high-signal answers.',
  'Prefer trustworthy, up-to-date and locally relevant guidance.',
].join(' ');

export function buildTripPlanningPrompt(input: {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
}) {
  return `Plan a Zimbabwe trip to ${input.destination} from ${input.startDate} to ${input.endDate}. ${
    input.budget ? `Budget: ${input.budget}.` : ''
  } Return itinerary, transport, accommodation and risk checks.`;
}
