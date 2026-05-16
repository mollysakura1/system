import axios from 'axios';
import { API_BASE_URL } from '../config/env';

let csrfToken = '';
let csrfPromise: Promise<string> | null = null;

const rawClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true
});

function normalizeUrl(url = '') {
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname.replace(/^\/api/, '') || '/';
    } catch {
      return url;
    }
  }

  return url.startsWith('/') ? url : `/${url}`;
}

export function isMutatingMethod(method = 'GET') {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

export function shouldAttachWriteSecurity(url = '', method = 'GET') {
  const path = normalizeUrl(url);
  if (!isMutatingMethod(method)) return false;
  if (path.startsWith('/auth/')) return false;
  return true;
}

export async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  csrfPromise ??= rawClient
    .get<never, { data: { data: { token: string } } }>('/security/csrf')
    .then((response) => {
      csrfToken = response.data.data.token;
      return csrfToken;
    })
    .finally(() => {
      csrfPromise = null;
    });

  return csrfPromise;
}

export async function buildWriteSecurityHeaders(url = '', method = 'GET') {
  if (!shouldAttachWriteSecurity(url, method)) return {};

  const headers: Record<string, string> = {
    'X-CSRF-Token': await getCsrfToken(),
    'X-Request-Nonce': crypto.randomUUID(),
    'X-Request-Timestamp': String(Date.now())
  };

  if (method.toUpperCase() === 'POST') {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  return headers;
}

export function clearCsrfToken() {
  csrfToken = '';
}
