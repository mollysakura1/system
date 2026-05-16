import request from '../utils/request';
import type { AppMenu, PaginatedResult, SiteMessage, UserRecord } from '../types';

type RolePayload = Record<string, string | number | boolean | string[]>;

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
  return request.get<never, { data: RolePayload[] }>('/roles');
}

export function createRoleApi(payload: RolePayload) {
  return request.post<never, { data: RolePayload }>('/roles', payload);
}

export function updateRoleApi(id: string, payload: RolePayload) {
  return request.patch<never, { data: RolePayload }>(`/roles/${id}`, payload);
}

export function deleteRoleApi(id: string) {
  return request.delete<never, { data: { id: string } }>(`/roles/${id}`);
}

export function getLogsApi() {
  return request.get<never, { data: PaginatedResult<Record<string, string>> }>('/logs');
}

export function getMessagesApi() {
  return request.get<never, { data: { list: SiteMessage[]; total: number; unread: number } }>('/messages');
}

export function readMessageApi(id: string) {
  return request.patch<never, { data: SiteMessage }>(`/messages/${id}`, { read: true });
}

export function requestPermissionApi(targetRole: string) {
  return request.post<never, { data: { success: boolean } }>('/permission-requests', { targetRole });
}
