import { api } from '@/lib/api';
import type { ApiResult } from '@/types/api';

export async function sendChatMessage(payload: { sessionId: string; message: string; locale?: string }) {
  const response = await api.post<ApiResult<{ response: { role: string; content: string } }>>('/v2/ai/chat', payload);
  return response.data;
}
