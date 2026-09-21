import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../lib/errors';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
        .join('; ');
      next(new ValidationError(message));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || 'query'}: ${issue.message}`)
        .join('; ');
      next(new ValidationError(message));
      return;
    }
    req.validatedQuery = result.data;
    next();
  };
}
