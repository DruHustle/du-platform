export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiSessionContext = {
  sessionId: string;
  userId?: number;
  locale?: string;
};

export type TripRequest = {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
};
