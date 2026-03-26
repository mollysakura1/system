import request from '../utils/request';
import type { AppMenu, PaginatedResult, SiteMessage, UserRecord } from '../types';

export function getMenusApi() {
  return request.get<never, { data: AppMenu[] }>('/menus');
}

export function getUsersApi() {
  return request.get<never, { data: PaginatedResult<UserRecord> }>('/users');
}

export function createUserApi(payload: Partial<UserRecord> & { username: string; name: string; role: string; password?: string }) {
  return request.post<never, { data: { id: string } }>('/users', payload);
}

export function updateUserApi(id: string, payload: Partial<UserRecord> & { password?: string }) {
  return request.patch<never, { data: UserRecord }>(`/users/${id}`, payload);
}

export function deleteUserApi(id: string) {
  return request.delete<never, { data: { id: string } }>(`/users/${id}`);
}

export function getRolesApi() {
  return request.get<never, { data: Array<Record<string, string>> }>('/roles');
}

export function getLogsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string>> }>('/logs');
}

export function getMessagesApi() {
  return request.get<never, { data: { list: SiteMessage[]; total: number; unread: number } }>('/messages');
}

export function readMessageApi(id: string) {
  return request.post<never, { data: SiteMessage }>(`/messages/${id}/read`);
}

export function requestPermissionApi(targetRole: string) {
  return request.post<never, { data: { success: boolean } }>('/messages/permission-request', { targetRole });
}
