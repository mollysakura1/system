import request from '../utils/request';

export function getAiPromptsApi() {
  return request.get<never, { data: string[] }>('/ai/prompts');
}
