import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/auth.js';

const ACCESS_SECRET = 'ai-ops-access-secret';
const REFRESH_SECRET = 'ai-ops-refresh-secret';

export function signAccessToken(payload: Omit<JwtPayload, 'type'>) {
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_SECRET, { expiresIn: '30m' });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'type'>) {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
