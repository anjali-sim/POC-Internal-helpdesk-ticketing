import type { NextFunction, Request, Response } from 'express';

import { AppError, IllegalTransitionError } from '../lib/errors';
import { logger } from '../lib/logger';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express requires 4 params to detect error-handling middleware
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof IllegalTransitionError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        from: err.from,
        to: err.to,
        allowedTransitions: err.allowedTransitions,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  (req.log ?? logger).error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
