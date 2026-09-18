import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';

import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { verifyAuthToken } from '../lib/jwt';
import { AUTH_COOKIE_NAME } from './cookie';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    next(new UnauthorizedError());
    return;
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired session'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
