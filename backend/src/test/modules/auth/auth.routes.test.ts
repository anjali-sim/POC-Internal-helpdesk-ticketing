import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/prisma', async () => (await import('../../prisma-mock')).prismaMockFactory());

import app from '../../../app';
import { verifyAuthToken } from '../../../lib/jwt';
import { hashPassword } from '../../../lib/password';
import { prisma } from '../../../lib/prisma';
import { AUTH_COOKIE_NAME } from '../../../middleware/cookie';
import { agent, authCookie, buildUser, requester } from '../../factories';
import { resetPrismaMock, type PrismaMock } from '../../prisma-mock';

const db = prisma as unknown as PrismaMock;

/** Pulls the auth_token cookie out of a Set-Cookie header. */
function authTokenCookie(res: request.Response): string | undefined {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
}

beforeEach(() => resetPrismaMock(db));

// bcrypt at 12 rounds dominates the runtime of the register/login paths.
describe('POST /api/auth/register', { timeout: 20_000 }, () => {
  it('creates a REQUESTER, returns 201 and sets the session cookie', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
      buildUser({ id: 'user_new', ...data } as never),
    );

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita Requester', email: 'rita@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: 'user_new',
      name: 'Rita Requester',
      email: 'rita@example.com',
      role: Role.REQUESTER,
    });
    expect(authTokenCookie(res)).toBeDefined();
  });

  it('stores a bcrypt hash, never the plaintext password', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(buildUser({ id: 'user_new' }));

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123' });

    const { data } = db.user.create.mock.calls[0]?.[0] as { data: { password: string } };
    expect(data.password).not.toBe('password123');
    expect(data.password).toMatch(/^\$2[aby]\$/);
  });

  it('never returns the password in the response body', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(buildUser({ id: 'user_new' }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123' });

    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain('password123');
  });

  it('issues a cookie that is httpOnly and scoped to the whole site', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(buildUser({ id: 'user_new' }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123' });

    const cookie = authTokenCookie(res) as string;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/');
    // Outside production the cookie stays SameSite=Lax so plain http works.
    expect(cookie).toContain('SameSite=Lax');
  });

  it('signs the cookie with the new user id and role', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(buildUser({ id: 'user_new', role: Role.REQUESTER }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123' });

    const token = (authTokenCookie(res) as string).split(';')[0]?.split('=')[1] as string;
    expect(verifyAuthToken(decodeURIComponent(token))).toEqual({
      sub: 'user_new',
      role: Role.REQUESTER,
    });
  });

  it('cannot be used to self-assign the AGENT role', async () => {
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(buildUser({ id: 'user_new' }));

    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123', role: Role.AGENT });

    const { data } = db.user.create.mock.calls[0]?.[0] as { data: { role: Role } };
    expect(data.role).toBe(Role.REQUESTER);
  });

  it('rejects a duplicate email with 409', async () => {
    db.user.findUnique.mockResolvedValue(buildUser({ email: 'rita@example.com' }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rita', email: 'rita@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a malformed email', { name: 'Rita', email: 'not-an-email', password: 'password123' }],
    ['a short password', { name: 'Rita', email: 'rita@example.com', password: 'short' }],
    ['a blank name', { name: '   ', email: 'rita@example.com', password: 'password123' }],
    ['a missing password', { name: 'Rita', email: 'rita@example.com' }],
    ['an empty body', {}],
  ])('rejects %s with 400', async (_label, payload) => {
    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', { timeout: 20_000 }, () => {
  it('returns the user and a session cookie for correct credentials', async () => {
    const user = buildUser({
      id: 'user_1',
      email: 'rita@example.com',
      role: Role.REQUESTER,
      password: await hashPassword('password123'),
    });
    db.user.findUnique.mockResolvedValue(user);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rita@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: 'user_1',
      name: user.name,
      email: 'rita@example.com',
      role: Role.REQUESTER,
    });
    expect(authTokenCookie(res)).toBeDefined();
  });

  it('encodes the agent role in the token so later requests are authorised', async () => {
    db.user.findUnique.mockResolvedValue(
      buildUser({ id: 'user_a', role: Role.AGENT, password: await hashPassword('password123') }),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@example.com', password: 'password123' });

    const token = (authTokenCookie(res) as string).split(';')[0]?.split('=')[1] as string;
    expect(verifyAuthToken(decodeURIComponent(token)).role).toBe(Role.AGENT);
  });

  it('rejects a wrong password with 401', async () => {
    db.user.findUnique.mockResolvedValue(
      buildUser({ password: await hashPassword('password123') }),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rita@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(authTokenCookie(res)).toBeUndefined();
  });

  it('rejects an unknown email with 401', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('gives the same message whether the email or the password was wrong', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    db.user.findUnique.mockResolvedValue(
      buildUser({ password: await hashPassword('password123') }),
    );
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rita@example.com', password: 'nope' });

    expect(unknownEmail.body.error.message).toBe('Invalid email or password');
    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
  });

  it.each([
    ['a malformed email', { email: 'nope', password: 'password123' }],
    ['an empty password', { email: 'rita@example.com', password: '' }],
    ['an empty body', {}],
  ])('rejects %s with 400 before touching the database', async (_label, payload) => {
    const res = await request(app).post('/api/auth/login').send(payload);

    expect(res.status).toBe(400);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie and answers 204', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(204);
    expect(authTokenCookie(res)).toContain(`${AUTH_COOKIE_NAME}=;`);
  });

  it('is safe to call without a session', async () => {
    await expect(
      request(app)
        .post('/api/auth/logout')
        .then((r) => r.status),
    ).resolves.toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const user = requester();
    db.user.findUnique.mockResolvedValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(user));

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
    expect(db.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: user.id } }),
    );
  });

  it('selects only safe columns, never the password', async () => {
    const user = agent();
    db.user.findUnique.mockResolvedValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    await request(app).get('/api/auth/me').set('Cookie', authCookie(user));

    const { select } = db.user.findUnique.mock.calls[0]?.[0] as { select: Record<string, boolean> };
    expect(select).toEqual({ id: true, name: true, email: true, role: true });
  });

  it('answers 401 without a cookie', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('answers 401 for a garbage cookie', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', `${AUTH_COOKIE_NAME}=garbage`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid or expired session');
  });

  it('answers 401 when the token is valid but the user has since been deleted', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(requester()));

    expect(res.status).toBe(401);
  });

  it('answers 500 without leaking detail when the database fails', async () => {
    db.user.findUnique.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const res = await request(app).get('/api/auth/me').set('Cookie', authCookie(requester()));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
  });
});

describe('GET /health', () => {
  it('needs no authentication', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
