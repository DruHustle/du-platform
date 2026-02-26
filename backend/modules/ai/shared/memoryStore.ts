import type { ChatMessage } from '../types/ai.types';

const memory = new Map<string, ChatMessage[]>();

export class AiMemoryStore {
  append(sessionId: string, message: ChatMessage) {
    const previous = memory.get(sessionId) ?? [];
    memory.set(sessionId, [...previous, message].slice(-50));
  }

  read(sessionId: string): ChatMessage[] {
    return memory.get(sessionId) ?? [];
  }

  clear(sessionId: string) {
    memory.delete(sessionId);
  }
}
