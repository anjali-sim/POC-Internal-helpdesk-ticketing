import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  IllegalTransitionError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../lib/errors';

describe('error classes', () => {
  it.each([
    [new ValidationError('bad input'), 400, 'VALIDATION_ERROR', 'bad input'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED', 'Authentication required'],
    [new ForbiddenError(), 403, 'FORBIDDEN', 'You do not have access to this resource'],
    [new NotFoundError(), 404, 'NOT_FOUND', 'Not found'],
    [new ConflictError('already exists'), 409, 'CONFLICT', 'already exists'],
  ])('%#: carries its status, code and message', (err, statusCode, code, message) => {
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(statusCode);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });

  it('lets 401 and 403 override the default message', () => {
    expect(new UnauthorizedError('Invalid or expired session').message).toBe(
      'Invalid or expired session',
    );
    expect(new ForbiddenError('Requesters do not have a dashboard').message).toBe(
      'Requesters do not have a dashboard',
    );
  });

  describe('IllegalTransitionError', () => {
    const err = new IllegalTransitionError('new', 'resolved', ['assigned']);

    it('is a 422, distinct from a 400 ValidationError', () => {
      expect(err.statusCode).toBe(422);
      expect(err.code).toBe('ILLEGAL_TRANSITION');
      expect(err).not.toBeInstanceOf(ValidationError);
    });

    it('names the attempted move and the legal ones', () => {
      expect(err.message).toBe('Cannot transition ticket from "new" to "resolved"');
      expect(err.from).toBe('new');
      expect(err.to).toBe('resolved');
      expect(err.allowedTransitions).toEqual(['assigned']);
    });
  });
});
