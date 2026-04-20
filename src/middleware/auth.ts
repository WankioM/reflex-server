import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from '../errors/errorCodes';
import type { JwtPayload } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const err = Errors.AUTH_INVALID();
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.authUser = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    const err = Errors.AUTH_EXPIRED();
    res.status(err.statusCode).json({ error: err.message, code: err.code, action: err.action });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
      req.authUser = { userId: payload.userId, role: payload.role };
    } catch {
      // Token invalid — proceed without auth
    }
  }

  next();
}
