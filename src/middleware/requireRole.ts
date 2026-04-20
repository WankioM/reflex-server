import { Request, Response, NextFunction } from 'express';
import { Errors } from '../errors/errorCodes';
import type { UserRole } from '../types';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  free: 0,
  pro: 1,
  team: 2,
  admin: 3,
};

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      const err = Errors.AUTH_INVALID();
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    if (!allowedRoles.includes(req.authUser.role)) {
      const err = Errors.AUTH_FORBIDDEN();
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    next();
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.authUser) {
      const err = Errors.AUTH_INVALID();
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    if (ROLE_HIERARCHY[req.authUser.role] < ROLE_HIERARCHY[minRole]) {
      const err = Errors.AUTH_FORBIDDEN();
      res.status(err.statusCode).json({ error: err.message, code: err.code });
      return;
    }

    next();
  };
}
