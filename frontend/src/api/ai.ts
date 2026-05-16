import request from '../utils/request';
import type { ChatMessageItem, ChatSession, PaginatedResult } from '../types';

export function getAiPromptsApi() {
  return request.get<never, { data: string[] }>('/ai/prompts');
}

export function getAiSessionsApi() {
  return request.get<never, { data: PaginatedResult<ChatSession> }>('/ai/sessions');
}

export function createAiSessionApi(payload: Pick<ChatSession, 'id' | 'title' | 'updatedAt'>) {
  return request.post<never, { data: ChatSession }>('/ai/sessions', payload);
}

export function updateAiSessionApi(id: string, payload: Partial<Pick<ChatSession, 'title' | 'updatedAt'>>) {
  return request.patch<never, { data: ChatSession }>(`/ai/sessions/${id}`, payload);
}

export function deleteAiSessionApi(id: string) {
  return request.delete<never, { data: { id: string } }>(`/ai/sessions/${id}`);
}

export function saveAiMessageApi(sessionId: string, payload: ChatMessageItem) {
  return request.post<never, { data: ChatSession }>(`/ai/sessions/${sessionId}/messages`, payload);
}
