import type { Request, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'ai_ops_access';
export const REFRESH_TOKEN_COOKIE = 'ai_ops_refresh';

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function shouldUseSecureCookie(req: Request) {
  if (process.env.COOKIE_SECURE) {
    return process.env.COOKIE_SECURE === 'true';
  }

  const host = req.hostname;
  return host !== 'localhost' && host !== '127.0.0.1';
}

function getCookieOptions(req: Request, maxAge: number) {
  const secure = shouldUseSecureCookie(req);

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: '/api',
    maxAge
  };
}

export function setAuthCookies(req: Request, res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, getCookieOptions(req, ACCESS_TOKEN_MAX_AGE));
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, getCookieOptions(req, REFRESH_TOKEN_MAX_AGE));
}

export function clearAuthCookies(req: Request, res: Response) {
  const secure = shouldUseSecureCookie(req);
  const options = {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' as const : 'lax' as const,
    path: '/api'
  };

  res.clearCookie(ACCESS_TOKEN_COOKIE, options);
  res.clearCookie(REFRESH_TOKEN_COOKIE, options);
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
