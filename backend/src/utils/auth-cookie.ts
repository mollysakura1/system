import type { Request, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'ai_ops_access';
export const REFRESH_TOKEN_COOKIE = 'ai_ops_refresh';

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_PATH = '/api/auth';

function shouldUseSecureCookie(req: Request) {
  if (process.env.COOKIE_SECURE) {
    return process.env.COOKIE_SECURE === 'true';
  }

  const host = req.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function getRefreshCookieOptions(req: Request) {
  const secure = shouldUseSecureCookie(req);

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: REFRESH_TOKEN_PATH,
    maxAge: REFRESH_TOKEN_MAX_AGE
  };
}

export function setAuthCookies(req: Request, res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getRefreshCookieOptions(req));
}

export function clearAuthCookies(req: Request, res: Response) {
  const secure = shouldUseSecureCookie(req);
  const refreshOptions = {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: REFRESH_TOKEN_PATH
  };
  const legacyOptions = {
    ...refreshOptions,
    path: '/api'
  };

  res.clearCookie(ACCESS_TOKEN_COOKIE, legacyOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, refreshOptions);
  res.clearCookie(REFRESH_TOKEN_COOKIE, legacyOptions);
}

export function getCookieValue(req: Request, name: string) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return '';

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawKey, ...rawValue] = cookie.trim().split('=');
    if (rawKey !== name) continue;
    return decodeURIComponent(rawValue.join('='));
  }

  return '';
}
