import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { afterEach, describe, expect, it } from 'vitest';

import { signAuthToken, verifyAuthToken } from '../../lib/jwt';

const SECRET = process.env.JWT_SECRET as string;

describe('signAuthToken / verifyAuthToken', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('round-trips the subject and role', () => {
    const token = signAuthToken({ sub: 'user_1', role: Role.AGENT });
    expect(verifyAuthToken(token)).toEqual({ sub: 'user_1', role: Role.AGENT });
  });

  it('drops any extra claims the token happens to carry', () => {
    const token = jwt.sign({ sub: 'user_1', role: Role.REQUESTER, admin: true }, SECRET);
    expect(verifyAuthToken(token)).toEqual({ sub: 'user_1', role: Role.REQUESTER });
  });

  it('rejects a token signed with a different secret', () => {
    const token = jwt.sign({ sub: 'user_1', role: Role.AGENT }, 'some-other-secret');
    expect(() => verifyAuthToken(token)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejects a tampered token', () => {
    const token = signAuthToken({ sub: 'user_1', role: Role.REQUESTER });
    expect(() => verifyAuthToken(`${token}x`)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ sub: 'user_1', role: Role.AGENT }, SECRET, { expiresIn: '-1s' });
    expect(() => verifyAuthToken(token)).toThrow(jwt.TokenExpiredError);
  });

  it('rejects a payload missing the role claim', () => {
    const token = jwt.sign({ sub: 'user_1' }, SECRET);
    expect(() => verifyAuthToken(token)).toThrow('Malformed token payload');
  });

  it('rejects a string payload', () => {
    const token = jwt.sign('just-a-string', SECRET);
    expect(() => verifyAuthToken(token)).toThrow('Malformed token payload');
  });

  it('throws a clear error when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    expect(() => signAuthToken({ sub: 'user_1', role: Role.AGENT })).toThrow(
      'JWT_SECRET environment variable is not set',
    );
  });
});
