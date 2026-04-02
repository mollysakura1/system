import type { NextFunction, Request, Response } from 'express';
import { users } from '../mock/data.js';
import { verifyAccessToken } from '../utils/token.js';

export interface AuthRequest extends Request {
  user?: typeof users[number];
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authorization = req.headers.authorization;
  const token = authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ code: 401, message: '未登录', data: null });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    const user = users.find((item) => item.id === payload.userId);

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
