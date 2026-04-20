import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { env } from '../config/env';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // Log all errors server-side
  console.error(`[error] ${err.message}`, {
    stack: env.isDev ? err.stack : undefined,
    code: err instanceof AppError ? err.code : 'INTERNAL_ERROR',
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.action && { action: err.action }),
    });
    return;
  }

  // Unexpected errors — don't leak details in production
  res.status(500).json({
    error: env.isDev ? err.message : 'Something went wrong. Please try again later.',
    code: 'INTERNAL_ERROR',
  });
}
