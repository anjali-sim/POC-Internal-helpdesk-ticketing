import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ValidationError } from '../../lib/errors';
import { validateBody, validateQuery } from '../../middleware/validate';

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  age: z.coerce.number().int().min(0).default(0),
});

function ctx(payload: unknown, key: 'body' | 'query' = 'body') {
  const req = { [key]: payload } as unknown as Request;
  const next = vi.fn();
  return { req, res: {} as Response, next: next as unknown as NextFunction, spy: next };
}

describe('validateBody', () => {
  it('replaces the body with the parsed data, applying defaults', () => {
    const { req, res, next, spy } = ctx({ name: 'Rita' });
    validateBody(schema)(req, res, next);

    expect(spy).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Rita', age: 0 });
  });

  it('applies schema transforms such as trim', () => {
    const { req, res, next } = ctx({ name: '  Rita  ', age: 30 });
    validateBody(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Rita', age: 30 });
  });

  it('strips unknown keys', () => {
    const { req, res, next } = ctx({ name: 'Rita', role: 'AGENT' });
    validateBody(schema)(req, res, next);

    expect(req.body).not.toHaveProperty('role');
  });

  it('passes a ValidationError naming the offending field', () => {
    const { req, res, next, spy } = ctx({ name: '' });
    validateBody(schema)(req, res, next);

    const err = spy.mock.calls[0]?.[0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toContain('name: Name is required');
  });

  it('joins every issue into one message', () => {
    const { req, res, next, spy } = ctx({ name: '', age: 'abc' });
    validateBody(schema)(req, res, next);

    expect(spy.mock.calls[0]?.[0].message).toMatch(/name:.*;.*age:/s);
  });

  it('labels a top-level failure "body" when the issue has no path', () => {
    const { req, res, next, spy } = ctx('not-an-object');
    validateBody(schema)(req, res, next);

    expect(spy.mock.calls[0]?.[0].message).toMatch(/^body: /);
  });
});

describe('validateQuery', () => {
  it('writes the parsed query to req.validatedQuery, leaving req.query alone', () => {
    const { req, res, next, spy } = ctx({ name: 'Rita', age: '42' }, 'query');
    validateQuery(schema)(req, res, next);

    expect(spy).toHaveBeenCalledWith();
    expect(req.validatedQuery).toEqual({ name: 'Rita', age: 42 });
    expect(req.query).toEqual({ name: 'Rita', age: '42' });
  });

  it('labels a top-level failure "query"', () => {
    const { req, res, next, spy } = ctx('not-an-object', 'query');
    validateQuery(schema)(req, res, next);

    expect(spy.mock.calls[0]?.[0].message).toMatch(/^query: /);
  });

  it('does not set validatedQuery when validation fails', () => {
    const { req, res, next } = ctx({ name: '' }, 'query');
    validateQuery(schema)(req, res, next);

    expect(req.validatedQuery).toBeUndefined();
  });
});
