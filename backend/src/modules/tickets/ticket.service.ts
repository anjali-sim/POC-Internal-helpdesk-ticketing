import { Prisma, Role, TicketStatus as PrismaTicketStatus } from '@prisma/client';

import {
  ConflictError,
  ForbiddenError,
  IllegalTransitionError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getSystemUserId, pickNextAgentId } from './ticket.auto-assign';
import { toAssignmentDto, toCommentDto, toTicketDto, toTransitionDto } from './ticket.mapper';
import type {
  AssignTicketInput,
  CreateCommentInput,
  CreateTicketInput,
  ListTicketsQuery,
} from './ticket.schema';
import { slaDueDates } from './ticket.sla';
import {
  TRANSITIONS,
  isLegalTransition,
  toPrismaPriority,
  toPrismaStatus,
  toWireStatus,
  type TicketStatus,
} from './ticket.state-machine';

/** Statuses that count as "open" for the queue, dashboard and age report. */
const OPEN_STATUSES = [
  PrismaTicketStatus.NEW,
  PrismaTicketStatus.ASSIGNED,
  PrismaTicketStatus.IN_PROGRESS,
  PrismaTicketStatus.REOPENED,
] as const;

export interface AuthUser {
  id: string;
  role: Role;
}

const TICKET_INCLUDE = {
  requester: { select: { id: true, name: true } },
  assignments: {
    include: { agent: { select: { id: true, name: true } } },
    orderBy: { assignedAt: 'asc' as const },
  },
} satisfies Prisma.TicketInclude;

function logTransition(
  tx: Prisma.TransactionClient,
  params: {
    ticketId: string;
    from: PrismaTicketStatus | null;
    to: PrismaTicketStatus;
    changedById: string;
  },
) {
  return tx.ticketTransitionLog.create({
    data: {
      ticketId: params.ticketId,
      fromStatus: params.from,
      toStatus: params.to,
      changedById: params.changedById,
    },
  });
}

/** Agents see every ticket since all are auto-assigned; requesters see their own. */
function visibilityWhere(user: AuthUser): Prisma.TicketWhereInput {
  if (user.role === Role.AGENT) {
    return {};
  }
  return { requesterId: user.id };
}

/** Raises a ticket and round-robins it to an agent; stays NEW if there are none. */
export async function createTicket(requesterId: string, input: CreateTicketInput) {
  const createdAt = new Date();
  const { firstResponseDueAt, resolutionDueAt } = slaDueDates(input.priority, createdAt);

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        subject: input.subject,
        description: input.description,
        category: input.category,
        priority: toPrismaPriority(input.priority),
        requesterId,
        createdAt,
        firstResponseDueAt,
        resolutionDueAt,
      },
    });

    await logTransition(tx, {
      ticketId: created.id,
      from: null,
      to: PrismaTicketStatus.NEW,
      changedById: requesterId,
    });

    const agentId = await pickNextAgentId(tx);
    if (agentId) {
      await tx.assignment.create({ data: { ticketId: created.id, agentId } });
      await tx.ticket.update({
        where: { id: created.id },
        data: { status: PrismaTicketStatus.ASSIGNED },
      });
      // Attributed to the system, not the requester, so the timeline is honest.
      await logTransition(tx, {
        ticketId: created.id,
        from: PrismaTicketStatus.NEW,
        to: PrismaTicketStatus.ASSIGNED,
        changedById: await getSystemUserId(tx),
      });
    }

    return tx.ticket.findUniqueOrThrow({ where: { id: created.id }, include: TICKET_INCLUDE });
  });

  return toTicketDto(ticket);
}

/** Applies the optional status/priority/category filters shared by every ticket list. */
function applyListFilters(where: Prisma.TicketWhereInput, query: ListTicketsQuery) {
  if (query.scope === 'open') {
    where.status = { in: [...OPEN_STATUSES] };
  }
  if (query.status) {
    where.status = toPrismaStatus(query.status);
  }
  if (query.priority) {
    where.priority = toPrismaPriority(query.priority);
  }
  if (query.category) {
    where.category = query.category;
  }
}

async function paginateTickets(where: Prisma.TicketWhereInput, query: ListTicketsQuery) {
  const [total, tickets] = await prisma.$transaction([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: TICKET_INCLUDE,
      orderBy: { createdAt: 'asc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: tickets.map(toTicketDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
  };
}

export async function listTickets(user: AuthUser, query: ListTicketsQuery) {
  const where: Prisma.TicketWhereInput = { ...visibilityWhere(user) };
  applyListFilters(where, query);
  return paginateTickets(where, query);
}

/**
 * The agent's queue: tickets with an open assignment row for this agent. It is
 * built from the assignment, not from visibilityWhere, so it is never "every
 * ticket minus the ones that aren't mine". Open statuses unless the caller
 * names a status explicitly.
 */
export async function listQueue(user: AuthUser, query: ListTicketsQuery) {
  if (user.role !== Role.AGENT) {
    throw new ForbiddenError('Requesters do not have a queue');
  }

  const where: Prisma.TicketWhereInput = {
    assignments: { some: { agentId: user.id, unassignedAt: null } },
    status: { in: [...OPEN_STATUSES] },
  };
  applyListFilters(where, query);
  return paginateTickets(where, query);
}

async function findVisibleTicket(user: AuthUser, id: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, ...visibilityWhere(user) },
    include: TICKET_INCLUDE,
  });
  if (!ticket) {
    throw new NotFoundError('Ticket not found');
  }
  return ticket;
}

export async function getTicketById(user: AuthUser, id: string) {
  const ticket = await findVisibleTicket(user, id);

  const [comments, transitions] = await Promise.all([
    prisma.comment.findMany({
      where: {
        ticketId: id,
        ...(user.role === Role.REQUESTER ? { isInternal: false } : {}),
      },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.ticketTransitionLog.findMany({
      where: { ticketId: id },
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { changedAt: 'asc' },
    }),
  ]);

  return {
    ticket: toTicketDto(ticket),
    comments: comments.map(toCommentDto),
    assignments: ticket.assignments.map(toAssignmentDto),
    transitions: transitions.map(toTransitionDto),
  };
}

export async function transitionTicketStatus(user: AuthUser, id: string, to: TicketStatus) {
  const ticket = await findVisibleTicket(user, id);
  const from = toWireStatus(ticket.status);

  if (!isLegalTransition(from, to)) {
    throw new IllegalTransitionError(from, to, TRANSITIONS[from] ?? []);
  }

  const toPrisma = toPrismaStatus(to);
  const data: Prisma.TicketUpdateManyMutationInput = { status: toPrisma };
  if (toPrisma === PrismaTicketStatus.RESOLVED) {
    data.resolvedAt = new Date();
  } else if (toPrisma === PrismaTicketStatus.REOPENED) {
    data.resolvedAt = null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ticket.updateMany({
      where: { id, status: ticket.status },
      data,
    });

    if (result.count === 0) {
      throw new ConflictError('Ticket status changed concurrently — please retry');
    }

    await logTransition(tx, {
      ticketId: id,
      from: ticket.status,
      to: toPrisma,
      changedById: user.id,
    });

    return tx.ticket.findUniqueOrThrow({ where: { id }, include: TICKET_INCLUDE });
  });

  return toTicketDto(updated);
}

export async function assignTicket(user: AuthUser, id: string, input: AssignTicketInput) {
  const ticket = await findVisibleTicket(user, id);

  const agent = await prisma.user.findUnique({ where: { id: input.agentId } });
  if (!agent || agent.role !== Role.AGENT) {
    throw new ValidationError('agentId must reference an existing agent');
  }

  const currentStatus = toWireStatus(ticket.status);
  const shouldAutoTransition = currentStatus === 'new' || currentStatus === 'reopened';

  const updated = await prisma.$transaction(async (tx) => {
    await tx.assignment.updateMany({
      where: { ticketId: id, unassignedAt: null },
      data: { unassignedAt: new Date() },
    });

    await tx.assignment.create({
      data: { ticketId: id, agentId: agent.id },
    });

    if (shouldAutoTransition) {
      await tx.ticket.update({
        where: { id },
        data: { status: PrismaTicketStatus.ASSIGNED },
      });
      await logTransition(tx, {
        ticketId: id,
        from: ticket.status,
        to: PrismaTicketStatus.ASSIGNED,
        changedById: user.id,
      });
    }

    return tx.ticket.findUniqueOrThrow({ where: { id }, include: TICKET_INCLUDE });
  });

  return toTicketDto(updated);
}

export { getDashboard } from './ticket.dashboard';

export async function addComment(user: AuthUser, id: string, input: CreateCommentInput) {
  const ticket = await findVisibleTicket(user, id);

  const isInternal = user.role === Role.REQUESTER ? false : input.isInternal;

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { ticketId: id, authorId: user.id, body: input.body, isInternal },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    if (!ticket.firstRespondedAt && user.role !== Role.REQUESTER && !isInternal) {
      await tx.ticket.update({ where: { id }, data: { firstRespondedAt: new Date() } });
    }

    return created;
  });

  return toCommentDto(comment);
}
