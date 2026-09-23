import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import {
  ConflictError,
  IllegalTransitionError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors';
import { errorHandler } from '../../middleware/errorHandler';

function ctx(log?: { error: ReturnType<typeof vi.fn> }) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const req = { log } as unknown as Request;
  const res = { status } as unknown as Response;
  return { req, res, next: vi.fn() as unknown as NextFunction, status, json };
}

describe('errorHandler', () => {
  it('renders an AppError with its status and code', () => {
    const { req, res, next, status, json } = ctx();
    errorHandler(new NotFoundError('Ticket not found'), req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Ticket not found' },
    });
  });

  it.each([
    [new ValidationError('bad'), 400],
    [new ConflictError('nope'), 409],
  ])('maps %s to its status', (err, expected) => {
    const { req, res, next, status } = ctx();
    errorHandler(err, req, res, next);
    expect(status).toHaveBeenCalledWith(expected);
  });

  it('adds from/to/allowedTransitions for an illegal transition', () => {
    const { req, res, next, status, json } = ctx();
    errorHandler(new IllegalTransitionError('new', 'resolved', ['assigned']), req, res, next);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'ILLEGAL_TRANSITION',
        message: 'Cannot transition ticket from "new" to "resolved"',
        from: 'new',
        to: 'resolved',
        allowedTransitions: ['assigned'],
      },
    });
  });

  it('hides the detail of an unexpected error behind a 500', () => {
    const log = { error: vi.fn() };
    const { req, res, next, status, json } = ctx(log);
    errorHandler(new Error('connect ECONNREFUSED 127.0.0.1:5432'), req, res, next);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    expect(JSON.stringify(json.mock.calls[0])).not.toContain('ECONNREFUSED');
  });

  it('logs the unexpected error via the request logger', () => {
    const log = { error: vi.fn() };
    const { req, res, next } = ctx(log);
    const err = new Error('boom');
    errorHandler(err, req, res, next);

    expect(log.error).toHaveBeenCalledWith({ err }, 'Unhandled error');
  });

  it('falls back to the app logger when the request has none', () => {
    const { req, res, next, status } = ctx();
    expect(() => errorHandler(new Error('boom'), req, res, next)).not.toThrow();
    expect(status).toHaveBeenCalledWith(500);
  });

  it('handles a thrown non-Error value', () => {
    const { req, res, next, status } = ctx({ error: vi.fn() });
    errorHandler('just a string', req, res, next);

    expect(status).toHaveBeenCalledWith(500);
  });
});
