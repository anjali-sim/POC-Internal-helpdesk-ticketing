import { Role } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/prisma', async () => (await import('../../prisma-mock')).prismaMockFactory());

import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import { agent, authCookie, requester } from '../../factories';
import { resetPrismaMock, type PrismaMock } from '../../prisma-mock';

const db = prisma as unknown as PrismaMock;

beforeEach(() => resetPrismaMock(db));

describe('GET /api/users/agents', () => {
  const agents = [
    { id: 'agent_1', name: 'Alex Agent', email: 'alex@example.com', role: Role.AGENT },
    { id: 'agent_2', name: 'Bea Agent', email: 'bea@example.com', role: Role.AGENT },
  ];

  it('returns the agent list to an agent', async () => {
    db.user.findMany.mockResolvedValue(agents);

    const res = await request(app).get('/api/users/agents').set('Cookie', authCookie(agent()));

    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual(agents);
  });

  it('queries only agents, sorted by name, without the password column', async () => {
    db.user.findMany.mockResolvedValue([]);

    await request(app).get('/api/users/agents').set('Cookie', authCookie(agent()));

    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { role: Role.AGENT },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });
  });

  it('returns an empty list rather than 404 when there are no agents', async () => {
    db.user.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/users/agents').set('Cookie', authCookie(agent()));

    expect(res.status).toBe(200);
    expect(res.body.agents).toEqual([]);
  });

  it('forbids requesters from enumerating staff', async () => {
    const res = await request(app).get('/api/users/agents').set('Cookie', authCookie(requester()));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    const res = await request(app).get('/api/users/agents');

    expect(res.status).toBe(401);
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it('answers 500 when the query fails', async () => {
    db.user.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(app).get('/api/users/agents').set('Cookie', authCookie(agent()));

    expect(res.status).toBe(500);
  });
});
