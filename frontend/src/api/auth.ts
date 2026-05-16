import request from '../utils/request';
import type { CaptchaResult, LoginResult, UserProfile } from '../types';

export function loginApi(payload: { username: string; password: string; captchaId: string; captchaCode: string }) {
  return request.post<never, { data: LoginResult }>('/auth/login', payload);
}

export function registerApi(payload: {
  username: string;
  name: string;
  password: string;
  role: 'operator' | 'analyst' | 'merchant';
  captchaId: string;
  captchaCode: string;
}) {
  return request.post<never, { data: { userId: string } }>('/auth/register', payload);
}

export function getCaptchaApi() {
  return request.get<never, { data: CaptchaResult }>('/auth/captcha');
}

export function refreshTokenApi() {
  return request.post<never, { data: LoginResult }>('/auth/refresh');
}

export function getProfileApi() {
  return request.get<never, { data: UserProfile }>('/user/profile');
}

export function updateProfileApi(payload: Partial<Pick<UserProfile, 'avatar' | 'name' | 'phone' | 'email' | 'address'>> & { password?: string }) {
  return request.patch<never, { data: UserProfile }>('/user/profile', payload);
}

export function logoutApi() {
  return request.post<never, { data: null }>('/auth/logout');
}
