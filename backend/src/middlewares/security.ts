import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import { ACCESS_TOKEN_COOKIE, getCookieValue } from '../utils/auth-cookie.js';

const CSRF_COOKIE = 'ai_ops_csrf';
const CSRF_SECRET = process.env.CSRF_SECRET || 'ai-ops-csrf-secret';
const NONCE_TTL = 5 * 60 * 1000;
const IDEMPOTENCY_TTL = 10 * 60 * 1000;
const MAX_CLOCK_SKEW = 5 * 60 * 1000;

type IdempotencyRecord = {
  statusCode: number;
  body: unknown;
  expiresAt: number;
  processing: boolean;
};

const usedNonces = new Map<string, number>();
const idempotencyRecords = new Map<string, IdempotencyRecord>();

function isMutatingMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function isAuthBypass(path: string) {
  return path.startsWith('/auth/');
}

function shouldUseSecureCookie(req: Request) {
  if (process.env.COOKIE_SECURE) return process.env.COOKIE_SECURE === 'true';
  return req.hostname !== 'localhost' && req.hostname !== '127.0.0.1';
}

function signCsrfToken(nonce: string) {
  return createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex');
}

function createCsrfToken() {
  const nonce = randomUUID();
  return `${nonce}.${signCsrfToken(nonce)}`;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isValidCsrfToken(token: string) {
  const [nonce, signature] = token.split('.');
  if (!nonce || !signature) return false;
  return safeEqual(signature, signCsrfToken(nonce));
}

function getHeaderValue(req: Request, name: string) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value ?? '');
}

function getUserIdFromRequest(req: Request) {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.replace('Bearer ', '') : '';
  const token = bearerToken || getCookieValue(req, ACCESS_TOKEN_COOKIE);
  if (!token) return '';

  try {
    return verifyAccessToken(token).userId;
  } catch {
    return '';
  }
}

function cleanupExpiringMaps() {
  const now = Date.now();
  for (const [key, expiresAt] of usedNonces.entries()) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
  for (const [key, record] of idempotencyRecords.entries()) {
    if (record.expiresAt <= now) idempotencyRecords.delete(key);
  }
}

function reject(res: Response, status: number, message: string) {
  res.status(status).json({ code: status, message, data: null });
}

function validateCsrf(req: Request, res: Response) {
  const headerToken = getHeaderValue(req, 'x-csrf-token');
  const cookieToken = getCookieValue(req, CSRF_COOKIE);

  if (!headerToken || !cookieToken) {
    reject(res, 403, 'Missing CSRF token');
    return false;
  }

  if (!safeEqual(headerToken, cookieToken) || !isValidCsrfToken(headerToken)) {
    reject(res, 403, 'Invalid CSRF token');
    return false;
  }

  return true;
}

function validateNonce(req: Request, res: Response, userId: string) {
  const timestamp = Number(getHeaderValue(req, 'x-request-timestamp'));
  const nonce = getHeaderValue(req, 'x-request-nonce');
  const now = Date.now();

  if (!nonce || !Number.isFinite(timestamp)) {
    reject(res, 400, 'Missing anti-replay headers');
    return false;
  }

  if (Math.abs(now - timestamp) > MAX_CLOCK_SKEW) {
    reject(res, 400, 'Request timestamp is outside the allowed window');
    return false;
  }

  const nonceKey = `${userId}:${nonce}`;
  if (usedNonces.has(nonceKey)) {
    reject(res, 409, 'Replay request rejected');
    return false;
  }

  usedNonces.set(nonceKey, now + NONCE_TTL);
  return true;
}

function handleIdempotency(req: Request, res: Response, userId: string, next: NextFunction) {
  if (req.method.toUpperCase() !== 'POST') {
    next();
    return;
  }

  const key = getHeaderValue(req, 'idempotency-key');
  if (!key) {
    reject(res, 400, 'Missing Idempotency-Key');
    return;
  }

  const recordKey = `${userId}:${req.method}:${req.originalUrl}:${key}`;
  const existing = idempotencyRecords.get(recordKey);
  if (existing?.processing) {
    reject(res, 409, 'Request is already processing');
    return;
  }
  if (existing) {
    res.status(existing.statusCode).json(existing.body);
    return;
  }

  idempotencyRecords.set(recordKey, {
    statusCode: 0,
    body: null,
    expiresAt: Date.now() + IDEMPOTENCY_TTL,
    processing: true
  });

  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    if (res.statusCode < 500) {
      idempotencyRecords.set(recordKey, {
        statusCode: res.statusCode,
        body,
        expiresAt: Date.now() + IDEMPOTENCY_TTL,
        processing: false
      });
    } else {
      idempotencyRecords.delete(recordKey);
    }
    return originalJson(body);
  };

  res.on('close', () => {
    const record = idempotencyRecords.get(recordKey);
    if (record?.processing) idempotencyRecords.delete(recordKey);
  });

  next();
}

export function issueCsrfToken(req: Request, res: Response) {
  const token = createCsrfToken();
  const secure = shouldUseSecureCookie(req);

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api',
    maxAge: 60 * 60 * 1000
  });

  res.json({ code: 0, message: 'ok', data: { token } });
}

export function writeRequestSecurity(req: Request, res: Response, next: NextFunction) {
  if (!isMutatingMethod(req.method) || isAuthBypass(req.path)) {
    next();
    return;
  }

  cleanupExpiringMaps();

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    next();
    return;
  }

  if (!validateCsrf(req, res)) return;
  if (!validateNonce(req, res, userId)) return;

  handleIdempotency(req, res, userId, next);
}
