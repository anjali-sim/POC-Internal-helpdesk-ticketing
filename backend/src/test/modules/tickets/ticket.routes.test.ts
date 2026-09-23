import { Priority, Role, TicketStatus } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/prisma', async () => (await import('../../prisma-mock')).prismaMockFactory());

import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import {
  agent,
  assignedTo,
  authCookie,
  buildComment,
  buildTicket,
  buildUser,
  requester,
  ticketWithRelations,
} from '../../factories';
import { resetPrismaMock, type PrismaMock } from '../../prisma-mock';

const db = prisma as unknown as PrismaMock;

const rita = requester();
const alex = agent();
const asRequester = () => authCookie(rita);
const asAgent = () => authCookie(alex);

const VALID_TICKET = {
  subject: 'Laptop will not boot',
  description: 'Nothing happens when I press the power button.',
  category: 'hardware',
  priority: 'high',
};

beforeEach(() => {
  resetPrismaMock(db);
  // Most paths end by re-reading the ticket with its relations.
  db.ticket.findUniqueOrThrow.mockResolvedValue(ticketWithRelations());
  db.$queryRaw.mockResolvedValue([]);
});

describe('POST /api/tickets', () => {
  beforeEach(() => {
    db.ticket.create.mockResolvedValue(buildTicket({ id: 'ticket_new' }));
    db.ticketTransitionLog.create.mockResolvedValue({});
  });

  it('creates a ticket for a requester and answers 201', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Cookie', asRequester())
      .send(VALID_TICKET);

    expect(res.status).toBe(201);
    expect(res.body.ticket).toMatchObject({ subject: 'Laptop will not boot', priority: 'high' });
  });

  it('records the caller as the requester, ignoring any requesterId in the body', async () => {
    await request(app)
      .post('/api/tickets')
      .set('Cookie', asRequester())
      .send({ ...VALID_TICKET, requesterId: 'someone_else' });

    const { data } = db.ticket.create.mock.calls[0]?.[0] as { data: { requesterId: string } };
    expect(data.requesterId).toBe(rita.id);
  });

  it('stamps SLA due dates from the priority at creation time', async () => {
    await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

    const { data } = db.ticket.create.mock.calls[0]?.[0] as {
      data: { createdAt: Date; firstResponseDueAt: Date; resolutionDueAt: Date };
    };
    expect(data.firstResponseDueAt).toBeInstanceOf(Date);
    expect(data.resolutionDueAt).toBeInstanceOf(Date);
    expect(data.firstResponseDueAt.getTime()).toBeGreaterThan(data.createdAt.getTime());
    expect(data.resolutionDueAt.getTime()).toBeGreaterThan(data.firstResponseDueAt.getTime());
  });

  it('translates the wire priority to the Prisma enum', async () => {
    await request(app)
      .post('/api/tickets')
      .set('Cookie', asRequester())
      .send({ ...VALID_TICKET, priority: 'urgent' });

    const { data } = db.ticket.create.mock.calls[0]?.[0] as { data: { priority: Priority } };
    expect(data.priority).toBe(Priority.URGENT);
  });

  it('writes the opening NEW entry in the transition log', async () => {
    await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

    expect(db.ticketTransitionLog.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket_new',
        fromStatus: null,
        toStatus: TicketStatus.NEW,
        changedById: rita.id,
      },
    });
  });

  it('leaves the ticket NEW when there is no agent to take it', async () => {
    db.$queryRaw.mockResolvedValue([]);

    await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

    expect(db.assignment.create).not.toHaveBeenCalled();
    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  describe('auto-assignment', () => {
    beforeEach(() => {
      db.$queryRaw.mockResolvedValue([{ id: 'agent_next' }]);
      db.user.upsert.mockResolvedValue({ id: 'user_system' });
      db.assignment.create.mockResolvedValue({});
      db.ticket.update.mockResolvedValue({});
    });

    it('assigns the round-robin pick and moves the ticket to ASSIGNED', async () => {
      await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

      expect(db.assignment.create).toHaveBeenCalledWith({
        data: { ticketId: 'ticket_new', agentId: 'agent_next' },
      });
      expect(db.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket_new' },
        data: { status: TicketStatus.ASSIGNED },
      });
    });

    it('attributes the auto-transition to the system user, not the requester', async () => {
      await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

      expect(db.ticketTransitionLog.create).toHaveBeenLastCalledWith({
        data: {
          ticketId: 'ticket_new',
          fromStatus: TicketStatus.NEW,
          toStatus: TicketStatus.ASSIGNED,
          changedById: 'user_system',
        },
      });
    });

    it('does the whole create-and-assign inside one transaction', async () => {
      await request(app).post('/api/tickets').set('Cookie', asRequester()).send(VALID_TICKET);

      expect(db.$transaction).toHaveBeenCalledTimes(1);
      expect(typeof db.$transaction.mock.calls[0]?.[0]).toBe('function');
    });
  });

  it('forbids an agent from raising a ticket', async () => {
    const res = await request(app).post('/api/tickets').set('Cookie', asAgent()).send(VALID_TICKET);

    expect(res.status).toBe(403);
    expect(db.ticket.create).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    const res = await request(app).post('/api/tickets').send(VALID_TICKET);

    expect(res.status).toBe(401);
  });

  it.each([
    ['a blank subject', { ...VALID_TICKET, subject: '   ' }],
    ['an unknown category', { ...VALID_TICKET, category: 'spaceship' }],
    ['an unknown priority', { ...VALID_TICKET, priority: 'critical' }],
    ['an uppercase priority', { ...VALID_TICKET, priority: 'HIGH' }],
    ['a subject over 200 characters', { ...VALID_TICKET, subject: 'x'.repeat(201) }],
    ['a description over 5000 characters', { ...VALID_TICKET, description: 'x'.repeat(5001) }],
    ['an empty body', {}],
  ])('rejects %s with 400', async (_label, payload) => {
    const res = await request(app).post('/api/tickets').set('Cookie', asRequester()).send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(db.ticket.create).not.toHaveBeenCalled();
  });

  it('trims whitespace off the subject and description', async () => {
    await request(app)
      .post('/api/tickets')
      .set('Cookie', asRequester())
      .send({ ...VALID_TICKET, subject: '  Printer jam  ', description: '  Paper stuck  ' });

    const { data } = db.ticket.create.mock.calls[0]?.[0] as {
      data: { subject: string; description: string };
    };
    expect(data).toMatchObject({ subject: 'Printer jam', description: 'Paper stuck' });
  });
});

describe('GET /api/tickets', () => {
  beforeEach(() => {
    db.ticket.count.mockResolvedValue(1);
    db.ticket.findMany.mockResolvedValue([ticketWithRelations()]);
  });

  const lastFindManyArgs = () =>
    db.ticket.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      skip: number;
      take: number;
      orderBy: unknown;
    };

  it('returns a paginated envelope', async () => {
    const res = await request(app).get('/api/tickets').set('Cookie', asAgent());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(res.body.items).toHaveLength(1);
  });

  it('scopes a requester to their own tickets', async () => {
    await request(app).get('/api/tickets').set('Cookie', asRequester());

    expect(lastFindManyArgs().where).toMatchObject({ requesterId: rita.id });
  });

  it('shows an agent the whole helpdesk', async () => {
    await request(app).get('/api/tickets').set('Cookie', asAgent());

    expect(lastFindManyArgs().where).not.toHaveProperty('requesterId');
  });

  it('applies the default page and pageSize', async () => {
    await request(app).get('/api/tickets').set('Cookie', asAgent());

    expect(lastFindManyArgs()).toMatchObject({ skip: 0, take: 20, orderBy: { createdAt: 'asc' } });
  });

  it('translates page/pageSize into skip/take', async () => {
    await request(app).get('/api/tickets?page=3&pageSize=10').set('Cookie', asAgent());

    expect(lastFindManyArgs()).toMatchObject({ skip: 20, take: 10 });
  });

  it('filters by status, priority and category together', async () => {
    await request(app)
      .get('/api/tickets?status=in_progress&priority=urgent&category=billing')
      .set('Cookie', asAgent());

    expect(lastFindManyArgs().where).toMatchObject({
      status: TicketStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      category: 'billing',
    });
  });

  it('narrows scope=queue to the agent’s own open assignments', async () => {
    await request(app).get('/api/tickets?scope=queue').set('Cookie', asAgent());

    expect(lastFindManyArgs().where).toMatchObject({
      assignments: { some: { agentId: alex.id, unassignedAt: null } },
    });
  });

  it('forbids scope=queue for a requester', async () => {
    const res = await request(app).get('/api/tickets?scope=queue').set('Cookie', asRequester());

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Requesters do not have a queue');
  });

  it('narrows scope=open to the four open statuses', async () => {
    await request(app).get('/api/tickets?scope=open').set('Cookie', asAgent());

    expect(lastFindManyArgs().where.status).toEqual({
      in: [
        TicketStatus.NEW,
        TicketStatus.ASSIGNED,
        TicketStatus.IN_PROGRESS,
        TicketStatus.REOPENED,
      ],
    });
  });

  it('lets an explicit status override scope=open', async () => {
    await request(app).get('/api/tickets?scope=open&status=resolved').set('Cookie', asAgent());

    expect(lastFindManyArgs().where.status).toBe(TicketStatus.RESOLVED);
  });

  it('counts with the same filter it lists with', async () => {
    await request(app).get('/api/tickets?priority=low').set('Cookie', asAgent());

    const countArgs = db.ticket.count.mock.calls[0]?.[0] as { where: unknown };
    expect(countArgs.where).toEqual(lastFindManyArgs().where);
  });

  it.each([
    ['an unknown status', 'status=archived'],
    ['an unknown scope', 'scope=everything'],
    ['page 0', 'page=0'],
    ['a non-numeric page', 'page=abc'],
    ['a pageSize over the 100 cap', 'pageSize=500'],
  ])('rejects %s with 400', async (_label, query) => {
    const res = await request(app).get(`/api/tickets?${query}`).set('Cookie', asAgent());

    expect(res.status).toBe(400);
    expect(db.ticket.findMany).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    expect((await request(app).get('/api/tickets')).status).toBe(401);
  });
});

describe('GET /api/tickets/:id', () => {
  beforeEach(() => {
    db.ticket.findFirst.mockResolvedValue(
      ticketWithRelations(buildTicket({ id: 'ticket_1' }), [assignedTo(alex)]),
    );
    db.comment.findMany.mockResolvedValue([]);
    db.ticketTransitionLog.findMany.mockResolvedValue([]);
  });

  it('returns the ticket with its comments, assignments and transitions', async () => {
    db.comment.findMany.mockResolvedValue([
      { ...buildComment(), author: { id: alex.id, name: alex.name, role: Role.AGENT } },
    ]);
    db.ticketTransitionLog.findMany.mockResolvedValue([
      {
        id: 'log_1',
        ticketId: 'ticket_1',
        fromStatus: null,
        toStatus: TicketStatus.NEW,
        changedById: rita.id,
        changedAt: new Date('2026-01-05T10:00:00.000Z'),
        changedBy: { id: rita.id, name: rita.name },
      },
    ]);

    const res = await request(app).get('/api/tickets/ticket_1').set('Cookie', asAgent());

    expect(res.status).toBe(200);
    expect(res.body.ticket.id).toBe('ticket_1');
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.assignments).toHaveLength(1);
    expect(res.body.transitions[0]).toMatchObject({ fromStatus: null, toStatus: 'new' });
  });

  it('hides internal comments from the requester', async () => {
    await request(app).get('/api/tickets/ticket_1').set('Cookie', asRequester());

    const args = db.comment.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ ticketId: 'ticket_1', isInternal: false });
  });

  it('shows internal comments to an agent', async () => {
    await request(app).get('/api/tickets/ticket_1').set('Cookie', asAgent());

    const args = db.comment.findMany.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).not.toHaveProperty('isInternal');
  });

  it('constrains the lookup to tickets the requester owns', async () => {
    await request(app).get('/api/tickets/ticket_1').set('Cookie', asRequester());

    const args = db.ticket.findFirst.mock.calls[0]?.[0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ id: 'ticket_1', requesterId: rita.id });
  });

  it("answers 404 — not 403 — for another requester's ticket", async () => {
    db.ticket.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/tickets/ticket_other').set('Cookie', asRequester());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('answers 401 when signed out', async () => {
    expect((await request(app).get('/api/tickets/ticket_1')).status).toBe(401);
  });
});

describe('PATCH /api/tickets/:id/status', () => {
  const armTicket = (status: TicketStatus) =>
    db.ticket.findFirst.mockResolvedValue(
      ticketWithRelations(buildTicket({ id: 'ticket_1', status })),
    );

  beforeEach(() => {
    armTicket(TicketStatus.ASSIGNED);
    db.ticket.updateMany.mockResolvedValue({ count: 1 });
    db.ticketTransitionLog.create.mockResolvedValue({});
  });

  it('performs a legal transition and returns the updated ticket', async () => {
    db.ticket.findUniqueOrThrow.mockResolvedValue(
      ticketWithRelations(buildTicket({ id: 'ticket_1', status: TicketStatus.IN_PROGRESS })),
    );

    const res = await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.ticket.status).toBe('in_progress');
  });

  it('guards the update on the status it read, so a concurrent change cannot be clobbered', async () => {
    await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    expect(db.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ticket_1', status: TicketStatus.ASSIGNED } }),
    );
  });

  it('answers 409 when that guard matches no rows', async () => {
    db.ticket.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(db.ticketTransitionLog.create).not.toHaveBeenCalled();
  });

  it('stamps resolvedAt when moving to resolved', async () => {
    armTicket(TicketStatus.IN_PROGRESS);

    await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'resolved' });

    const { data } = db.ticket.updateMany.mock.calls[0]?.[0] as { data: { resolvedAt: Date } };
    expect(data.resolvedAt).toBeInstanceOf(Date);
  });

  it('clears resolvedAt when reopening', async () => {
    armTicket(TicketStatus.CLOSED);

    await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'reopened' });

    const { data } = db.ticket.updateMany.mock.calls[0]?.[0] as {
      data: { resolvedAt: Date | null };
    };
    expect(data.resolvedAt).toBeNull();
  });

  it('leaves resolvedAt untouched for other transitions', async () => {
    await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    const { data } = db.ticket.updateMany.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(data).not.toHaveProperty('resolvedAt');
  });

  it('logs the transition against the acting agent', async () => {
    await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    expect(db.ticketTransitionLog.create).toHaveBeenCalledWith({
      data: {
        ticketId: 'ticket_1',
        fromStatus: TicketStatus.ASSIGNED,
        toStatus: TicketStatus.IN_PROGRESS,
        changedById: alex.id,
      },
    });
  });

  it('answers 422 with the legal moves for an illegal transition', async () => {
    armTicket(TicketStatus.NEW);

    const res = await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'resolved' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({
      code: 'ILLEGAL_TRANSITION',
      from: 'new',
      to: 'resolved',
      allowedTransitions: ['assigned'],
    });
    expect(db.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('answers 400, not 422, for a status that does not exist', async () => {
    const res = await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asAgent())
      .send({ to: 'archived' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('forbids a requester from driving the state machine', async () => {
    const res = await request(app)
      .patch('/api/tickets/ticket_1/status')
      .set('Cookie', asRequester())
      .send({ to: 'in_progress' });

    expect(res.status).toBe(403);
    expect(db.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('answers 404 for a ticket that does not exist', async () => {
    db.ticket.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/missing/status')
      .set('Cookie', asAgent())
      .send({ to: 'in_progress' });

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tickets/:id/assign', () => {
  const bea = buildUser({ id: 'agent_bea', name: 'Bea Agent', role: Role.AGENT });

  beforeEach(() => {
    db.ticket.findFirst.mockResolvedValue(
      ticketWithRelations(buildTicket({ id: 'ticket_1', status: TicketStatus.IN_PROGRESS })),
    );
    db.user.findUnique.mockResolvedValue(bea);
    db.assignment.updateMany.mockResolvedValue({ count: 1 });
    db.assignment.create.mockResolvedValue({});
    db.ticket.update.mockResolvedValue({});
    db.ticketTransitionLog.create.mockResolvedValue({});
  });

  it('closes the previous assignment before opening the new one', async () => {
    const res = await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asAgent())
      .send({ agentId: bea.id });

    expect(res.status).toBe(200);
    const { where, data } = db.assignment.updateMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      data: { unassignedAt: Date };
    };
    expect(where).toEqual({ ticketId: 'ticket_1', unassignedAt: null });
    expect(data.unassignedAt).toBeInstanceOf(Date);
    expect(db.assignment.create).toHaveBeenCalledWith({
      data: { ticketId: 'ticket_1', agentId: bea.id },
    });
  });

  it('does not touch the status of a ticket already in progress', async () => {
    await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asAgent())
      .send({ agentId: bea.id });

    expect(db.ticket.update).not.toHaveBeenCalled();
    expect(db.ticketTransitionLog.create).not.toHaveBeenCalled();
  });

  it.each([TicketStatus.NEW, TicketStatus.REOPENED])(
    'moves a %s ticket to ASSIGNED',
    async (status) => {
      db.ticket.findFirst.mockResolvedValue(
        ticketWithRelations(buildTicket({ id: 'ticket_1', status })),
      );

      await request(app)
        .patch('/api/tickets/ticket_1/assign')
        .set('Cookie', asAgent())
        .send({ agentId: bea.id });

      expect(db.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket_1' },
        data: { status: TicketStatus.ASSIGNED },
      });
      expect(db.ticketTransitionLog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket_1',
          fromStatus: status,
          toStatus: TicketStatus.ASSIGNED,
          changedById: alex.id,
        },
      });
    },
  );

  it('rejects an agentId that is a requester', async () => {
    db.user.findUnique.mockResolvedValue(rita);

    const res = await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asAgent())
      .send({ agentId: rita.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('agentId must reference an existing agent');
    expect(db.assignment.create).not.toHaveBeenCalled();
  });

  it('rejects an agentId that matches no user', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asAgent())
      .send({ agentId: 'nobody' });

    expect(res.status).toBe(400);
    expect(db.assignment.create).not.toHaveBeenCalled();
  });

  it('rejects a missing agentId with 400 before any lookup', async () => {
    const res = await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asAgent())
      .send({});

    expect(res.status).toBe(400);
    expect(db.ticket.findFirst).not.toHaveBeenCalled();
  });

  it('forbids a requester from assigning', async () => {
    const res = await request(app)
      .patch('/api/tickets/ticket_1/assign')
      .set('Cookie', asRequester())
      .send({ agentId: bea.id });

    expect(res.status).toBe(403);
  });

  it('answers 404 for a ticket that does not exist', async () => {
    db.ticket.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tickets/missing/assign')
      .set('Cookie', asAgent())
      .send({ agentId: bea.id });

    expect(res.status).toBe(404);
  });
});

describe('POST /api/tickets/:id/comments', () => {
  const commentWithAuthor = (overrides = {}) => ({
    ...buildComment({ ticketId: 'ticket_1', ...overrides }),
    author: { id: alex.id, name: alex.name, role: Role.AGENT },
  });

  beforeEach(() => {
    db.ticket.findFirst.mockResolvedValue(ticketWithRelations(buildTicket({ id: 'ticket_1' })));
    db.comment.create.mockResolvedValue(commentWithAuthor());
    db.ticket.update.mockResolvedValue({});
  });

  it('adds a comment and answers 201', async () => {
    const res = await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'Taking a look now.' });

    expect(res.status).toBe(201);
    expect(res.body.comment).toMatchObject({ body: 'Taking a look now.', authorName: alex.name });
  });

  it('defaults isInternal to false', async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'Hello' });

    const { data } = db.comment.create.mock.calls[0]?.[0] as { data: { isInternal: boolean } };
    expect(data.isInternal).toBe(false);
  });

  it('lets an agent post an internal note', async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'Internal note', isInternal: true });

    const { data } = db.comment.create.mock.calls[0]?.[0] as { data: { isInternal: boolean } };
    expect(data.isInternal).toBe(true);
  });

  it('forces isInternal to false for a requester, even if they ask for true', async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asRequester())
      .send({ body: 'Any update?', isInternal: true });

    const { data } = db.comment.create.mock.calls[0]?.[0] as { data: { isInternal: boolean } };
    expect(data.isInternal).toBe(false);
  });

  it("stamps firstRespondedAt on an agent's first public reply", async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'On it' });

    const call = db.ticket.update.mock.calls[0]?.[0] as { data: { firstRespondedAt: Date } };
    expect(call.data.firstRespondedAt).toBeInstanceOf(Date);
  });

  it('does not stamp firstRespondedAt for an internal note', async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'Internal', isInternal: true });

    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  it('does not stamp firstRespondedAt for a requester comment', async () => {
    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asRequester())
      .send({ body: 'Any update?' });

    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  it('does not overwrite an existing firstRespondedAt', async () => {
    db.ticket.findFirst.mockResolvedValue(
      ticketWithRelations(
        buildTicket({ id: 'ticket_1', firstRespondedAt: new Date('2026-01-05T10:30:00.000Z') }),
      ),
    );

    await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send({ body: 'Second reply' });

    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  it.each([
    ['a blank body', { body: '   ' }],
    ['a body over 5000 characters', { body: 'x'.repeat(5001) }],
    ['a non-boolean isInternal', { body: 'Hi', isInternal: 'yes' }],
    ['an empty payload', {}],
  ])('rejects %s with 400', async (_label, payload) => {
    const res = await request(app)
      .post('/api/tickets/ticket_1/comments')
      .set('Cookie', asAgent())
      .send(payload);

    expect(res.status).toBe(400);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("answers 404 on another requester's ticket", async () => {
    db.ticket.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/tickets/ticket_other/comments')
      .set('Cookie', asRequester())
      .send({ body: 'Hello' });

    expect(res.status).toBe(404);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    const res = await request(app).post('/api/tickets/ticket_1/comments').send({ body: 'Hello' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/tickets/dashboard', () => {
  const buckets = [
    {
      bucket: 'lt_24h',
      count: 3,
      breached: 1,
      oldestCreatedAt: new Date('2026-01-05T09:00:00.000Z'),
    },
    {
      bucket: 'gt_7d',
      count: 2,
      breached: 2,
      oldestCreatedAt: new Date('2025-12-20T09:00:00.000Z'),
    },
  ];
  const summary = [
    { openTotal: 5, unassigned: 1, firstResponseBreached: 2, resolutionBreached: 3 },
  ];

  it('returns all four age buckets in a fixed order, zero-filling the empty ones', async () => {
    db.$queryRaw.mockResolvedValueOnce(buckets).mockResolvedValueOnce(summary);

    const res = await request(app).get('/api/tickets/dashboard').set('Cookie', asAgent());

    expect(res.status).toBe(200);
    expect(res.body.ageBuckets.map((b: { bucket: string }) => b.bucket)).toEqual([
      'lt_24h',
      '1_3d',
      '3_7d',
      'gt_7d',
    ]);
    expect(res.body.ageBuckets[1]).toEqual({
      bucket: '1_3d',
      count: 0,
      breached: 0,
      oldestCreatedAt: null,
    });
  });

  it('passes the SLA summary through', async () => {
    db.$queryRaw.mockResolvedValueOnce(buckets).mockResolvedValueOnce(summary);

    const res = await request(app).get('/api/tickets/dashboard').set('Cookie', asAgent());

    expect(res.body.sla).toEqual(summary[0]);
  });

  it('falls back to zeroes when the summary query returns no row', async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const res = await request(app).get('/api/tickets/dashboard').set('Cookie', asAgent());

    expect(res.body.sla).toEqual({
      openTotal: 0,
      unassigned: 0,
      firstResponseBreached: 0,
      resolutionBreached: 0,
    });
    expect(res.body.ageBuckets).toHaveLength(4);
  });

  it('forbids requesters at the route guard, before any query runs', async () => {
    const res = await request(app).get('/api/tickets/dashboard').set('Cookie', asRequester());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    // requireRole(AGENT) rejects first, so the service's own requester check
    // (with its more specific message) is defence in depth rather than the
    // path an HTTP client actually hits.
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('answers 401 when signed out', async () => {
    expect((await request(app).get('/api/tickets/dashboard')).status).toBe(401);
  });

  it('is routed as the dashboard, not as a ticket with id "dashboard"', async () => {
    db.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await request(app).get('/api/tickets/dashboard').set('Cookie', asAgent());

    expect(db.ticket.findFirst).not.toHaveBeenCalled();
  });
});
