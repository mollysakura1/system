import type { ApiResponse } from '../types/common.js';

export function ok<T>(data: T, message = 'ok'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data
  };
}
