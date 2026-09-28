import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../lib/errors';

function parseOrThrow<T>(schema: ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.') || label}: ${issue.message}`)
      .join('; ');
    throw new ValidationError(message);
  }
  return result.data;
}

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = parseOrThrow(schema, req.body, 'body');
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.validatedQuery = parseOrThrow(schema, req.query, 'query');
      next();
    } catch (err) {
      next(err);
    }
  };
}
