import type { NextFunction, Request, Response } from 'express';
import type { CurrentUser } from '../types/auth.js';
import { getUserById } from '../database/db.js';
import { verifyAccessToken } from '../utils/token.js';
import { ACCESS_TOKEN_COOKIE, getCookieValue } from '../utils/auth-cookie.js';

export interface AuthRequest extends Request {
  user?: CurrentUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ') ? authorization.replace('Bearer ', '') : '';
  const token = bearerToken || getCookieValue(req, ACCESS_TOKEN_COOKIE);

  if (!token) {
    res.status(401).json({ code: 401, message: '未登录', data: null });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ code: 401, message: '用户不存在', data: null });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ code: 401, message: 'Token 已失效', data: null });
  }
}
