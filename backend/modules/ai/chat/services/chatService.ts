import type { ChatMessage } from '../../types/ai.types';
import { chatSystemPrompt } from '../../shared/promptTemplates';
import { AiMemoryStore } from '../../shared/memoryStore';
import { AiAnalyticsTracker } from '../../shared/analyticsTracker';

export class ChatService {
  constructor(
    private readonly memory = new AiMemoryStore(),
    private readonly analytics = new AiAnalyticsTracker()
  ) {}

  async respond(input: { sessionId: string; message: string; userId?: number }) {
    const context = this.memory.read(input.sessionId);
    const userMessage: ChatMessage = { role: 'user', content: input.message };
    this.memory.append(input.sessionId, userMessage);

    const response: ChatMessage = {
      role: 'assistant',
      content: `Onesa AI: ${input.message}`,
    };

    this.memory.append(input.sessionId, response);
    this.analytics.track({
      type: 'chat',
      sessionId: input.sessionId,
      userId: input.userId,
      metadata: { contextMessages: context.length, prompt: chatSystemPrompt },
    });

    return { response, contextSize: context.length + 2 };
  }
}
