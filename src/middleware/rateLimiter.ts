import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

// General API rate limit — per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down — try again in a few seconds.', code: 'RATE_LIMITED' },
  keyGenerator: (req: Request) => req.ip || 'unknown',
  skip: (req: Request) => {
    return req.authUser?.role === 'team' || req.authUser?.role === 'admin';
  },
});

// Assistant-specific rate limit — per user, stricter
export const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down — try again in a few seconds.', code: 'RATE_LIMITED' },
  keyGenerator: (req: Request) => req.authUser?.userId || req.ip || 'unknown',
  skip: (req: Request) => {
    return req.authUser?.role === 'team' || req.authUser?.role === 'admin';
  },
});

// Auth routes — per IP, prevent brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.', code: 'RATE_LIMITED' },
});
