import type { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ForbiddenError, UnauthorizedError } from '../../lib/errors';
import { signAuthToken } from '../../lib/jwt';
import { requireAuth, requireRole } from '../../middleware/auth';
import { AUTH_COOKIE_NAME } from '../../middleware/cookie';

function ctx(cookies: Record<string, unknown> = {}, user?: Request['user']) {
  const req = { cookies, user } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next: next as ReturnType<typeof vi.fn> };
}

describe('requireAuth', () => {
  let token: string;

  beforeEach(() => {
    token = signAuthToken({ sub: 'user_1', role: Role.AGENT });
  });

  it('attaches the user from a valid cookie and continues', () => {
    const { req, res, next } = ctx({ [AUTH_COOKIE_NAME]: token });
    requireAuth(req, res, next);

    expect(req.user).toEqual({ id: 'user_1', role: Role.AGENT });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a request with no cookie', () => {
    const { req, res, next } = ctx({});
    requireAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ message: 'Authentication required' });
  });

  it('rejects when cookie-parser never ran, so req.cookies is undefined', () => {
    const req = {} as Request;
    const next = vi.fn();
    requireAuth(req, {} as Response, next as unknown as NextFunction);

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a non-string cookie value', () => {
    const { req, res, next } = ctx({ [AUTH_COOKIE_NAME]: { nested: 'object' } });
    requireAuth(req, res, next);

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });

  it('reports an invalid token distinctly from a missing one', () => {
    const { req, res, next } = ctx({ [AUTH_COOKIE_NAME]: 'not-a-jwt' });
    requireAuth(req, res, next);

    expect(next.mock.calls[0]?.[0]).toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired session',
    });
  });
});

describe('requireRole', () => {
  it('lets a matching role through', () => {
    const { req, res, next } = ctx({}, { id: 'user_1', role: Role.AGENT });
    requireRole(Role.AGENT)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('accepts any of several allowed roles', () => {
    const { req, res, next } = ctx({}, { id: 'user_1', role: Role.REQUESTER });
    requireRole(Role.AGENT, Role.REQUESTER)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('forbids a role that is not listed', () => {
    const { req, res, next } = ctx({}, { id: 'user_1', role: Role.REQUESTER });
    requireRole(Role.AGENT)(req, res, next);

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(ForbiddenError);
  });

  it('answers 401, not 403, when requireAuth has not run', () => {
    const { req, res, next } = ctx({});
    requireRole(Role.AGENT)(req, res, next);

    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(UnauthorizedError);
  });
});
