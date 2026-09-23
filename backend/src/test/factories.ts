import {
  Priority,
  Role,
  TicketStatus,
  type Assignment,
  type Comment,
  type Ticket,
  type User,
} from '@prisma/client';

import { signAuthToken } from '../lib/jwt';
import { AUTH_COOKIE_NAME } from '../middleware/cookie';

let seq = 0;
const nextId = (prefix: string) => `${prefix}_${++seq}`;

export const REQUESTER_ID = 'user_requester';
export const AGENT_ID = 'user_agent';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: nextId('user'),
    email: `user${seq}@example.com`,
    name: 'Test User',
    role: Role.REQUESTER,
    password: '$2b$12$hashedhashedhashedhashedhashedhashedhashedhashedhashedha',
    createdAt: new Date('2026-01-01T09:00:00.000Z'),
    ...overrides,
  };
}

export const requester = () =>
  buildUser({ id: REQUESTER_ID, name: 'Rita Requester', role: Role.REQUESTER });
export const agent = () => buildUser({ id: AGENT_ID, name: 'Alex Agent', role: Role.AGENT });

export function buildTicket(overrides: Partial<Ticket> = {}): Ticket {
  const createdAt = overrides.createdAt ?? new Date('2026-01-05T10:00:00.000Z');
  return {
    id: nextId('ticket'),
    subject: 'Laptop will not boot',
    category: 'hardware',
    priority: Priority.HIGH,
    description: 'Nothing happens when I press the power button.',
    status: TicketStatus.NEW,
    requesterId: REQUESTER_ID,
    createdAt,
    updatedAt: createdAt,
    firstRespondedAt: null,
    resolvedAt: null,
    firstResponseDueAt: new Date('2026-01-05T11:00:00.000Z'),
    resolutionDueAt: new Date('2026-01-05T18:00:00.000Z'),
    ...overrides,
  };
}

export function buildAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: nextId('assignment'),
    ticketId: 'ticket_1',
    agentId: AGENT_ID,
    assignedAt: new Date('2026-01-05T10:05:00.000Z'),
    unassignedAt: null,
    ...overrides,
  };
}

export function buildComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: nextId('comment'),
    ticketId: 'ticket_1',
    authorId: AGENT_ID,
    body: 'Taking a look now.',
    isInternal: false,
    createdAt: new Date('2026-01-05T10:10:00.000Z'),
    ...overrides,
  };
}

/** The shape `TICKET_INCLUDE` produces, which `toTicketDto` expects. */
export function ticketWithRelations(
  ticket: Ticket = buildTicket(),
  assignments: Array<Assignment & { agent: Pick<User, 'id' | 'name'> }> = [],
) {
  return {
    ...ticket,
    requester: { id: ticket.requesterId, name: 'Rita Requester' },
    assignments,
  };
}

export function assignedTo(agentUser: User, overrides: Partial<Assignment> = {}) {
  return {
    ...buildAssignment({ agentId: agentUser.id, ...overrides }),
    agent: { id: agentUser.id, name: agentUser.name },
  };
}

/** A signed cookie header for supertest, produced by the real JWT signer. */
export function authCookie(user: Pick<User, 'id' | 'role'>): string {
  return `${AUTH_COOKIE_NAME}=${signAuthToken({ sub: user.id, role: user.role })}`;
}
