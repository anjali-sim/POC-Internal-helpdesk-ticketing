import { Prisma, Role, TicketStatus as PrismaTicketStatus } from '@prisma/client';

import {
  ConflictError,
  ForbiddenError,
  IllegalTransitionError,
  NotFoundError,
  ValidationError,
} from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import {
  toAssignmentDto,
  toCommentDto,
  toTicketDto,
  toTransitionDto,
} from './ticket.mapper';
import type { AssignTicketInput, CreateCommentInput, CreateTicketInput, ListTicketsQuery } from './ticket.schema';
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

function visibilityWhere(user: AuthUser): Prisma.TicketWhereInput {
  if (user.role === Role.ADMIN) {
    return {};
  }
  if (user.role === Role.AGENT) {
    return {
      OR: [{ status: PrismaTicketStatus.NEW }, { assignments: { some: { agentId: user.id } } }],
    };
  }
  return { requesterId: user.id };
}

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
      include: TICKET_INCLUDE,
    });

    await tx.ticketTransitionLog.create({
      data: {
        ticketId: created.id,
        fromStatus: null,
        toStatus: PrismaTicketStatus.NEW,
        changedById: requesterId,
      },
    });

    return created;
  });

  return toTicketDto(ticket);
}

export async function listTickets(user: AuthUser, query: ListTicketsQuery) {
  const where: Prisma.TicketWhereInput = { ...visibilityWhere(user) };

  if (query.scope === 'queue') {
    if (user.role === Role.REQUESTER) {
      throw new ForbiddenError('Requesters do not have a queue');
    }
    where.assignments = { some: { agentId: user.id, unassignedAt: null } };
  }
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

    await tx.ticketTransitionLog.create({
      data: { ticketId: id, fromStatus: ticket.status, toStatus: toPrisma, changedById: user.id },
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
      await tx.ticketTransitionLog.create({
        data: {
          ticketId: id,
          fromStatus: ticket.status,
          toStatus: PrismaTicketStatus.ASSIGNED,
          changedById: user.id,
        },
      });
    }

    return tx.ticket.findUniqueOrThrow({ where: { id }, include: TICKET_INCLUDE });
  });

  return toTicketDto(updated);
}

const AGE_BUCKETS = ['lt_24h', '1_3d', '3_7d', 'gt_7d'] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

interface AgeBucketRow {
  bucket: AgeBucket;
  count: number;
  breached: number;
  oldestCreatedAt: Date;
}

interface SlaSummaryRow {
  openTotal: number;
  unassigned: number;
  firstResponseBreached: number;
  resolutionBreached: number;
}

/**
 * Open tickets grouped by age, plus SLA breach counts.
 *
 * Both are aggregates executed in Postgres — no ticket rows cross the wire and
 * no age is computed in JS, so the cost stays flat as ticket volume grows. The
 * scans are served by the (status, createdAt) and (status, resolutionDueAt)
 * indexes on Ticket.
 */
export async function getDashboard(user: AuthUser) {
  if (user.role === Role.REQUESTER) {
    throw new ForbiddenError('Requesters do not have a dashboard');
  }

  // An agent's dashboard covers what an agent can see: unclaimed new tickets
  // plus their own queue. An admin's covers everything.
  const scope =
    user.role === Role.ADMIN
      ? Prisma.sql`TRUE`
      : Prisma.sql`(
          t."status" = 'NEW'::"TicketStatus"
          OR EXISTS (
            SELECT 1 FROM "Assignment" a
            WHERE a."ticketId" = t."id" AND a."agentId" = ${user.id} AND a."unassignedAt" IS NULL
          )
        )`;

  const openScope = Prisma.sql`t."status" IN ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'REOPENED') AND ${scope}`;

  const [buckets, summary] = await Promise.all([
    prisma.$queryRaw<AgeBucketRow[]>`
      SELECT
        CASE
          WHEN t."createdAt" > now() - interval '24 hours' THEN 'lt_24h'
          WHEN t."createdAt" > now() - interval '72 hours' THEN '1_3d'
          WHEN t."createdAt" > now() - interval '7 days'   THEN '3_7d'
          ELSE 'gt_7d'
        END AS bucket,
        count(*)::int AS count,
        count(*) FILTER (
          WHERE t."resolutionDueAt" IS NOT NULL AND now() > t."resolutionDueAt"
        )::int AS breached,
        min(t."createdAt") AS "oldestCreatedAt"
      FROM "Ticket" t
      WHERE ${openScope}
      GROUP BY 1
    `,
    prisma.$queryRaw<SlaSummaryRow[]>`
      SELECT
        count(*)::int AS "openTotal",
        count(*) FILTER (WHERE t."status" = 'NEW')::int AS "unassigned",
        count(*) FILTER (
          WHERE t."firstRespondedAt" IS NULL
            AND t."firstResponseDueAt" IS NOT NULL
            AND now() > t."firstResponseDueAt"
        )::int AS "firstResponseBreached",
        count(*) FILTER (
          WHERE t."resolutionDueAt" IS NOT NULL AND now() > t."resolutionDueAt"
        )::int AS "resolutionBreached"
      FROM "Ticket" t
      WHERE ${openScope}
    `,
  ]);

  const byBucket = new Map(buckets.map((row) => [row.bucket, row]));

  return {
    // Fixed bucket order, with empty buckets present so the UI table is stable.
    ageBuckets: AGE_BUCKETS.map((bucket) => ({
      bucket,
      count: byBucket.get(bucket)?.count ?? 0,
      breached: byBucket.get(bucket)?.breached ?? 0,
      oldestCreatedAt: byBucket.get(bucket)?.oldestCreatedAt ?? null,
    })),
    sla: summary[0] ?? {
      openTotal: 0,
      unassigned: 0,
      firstResponseBreached: 0,
      resolutionBreached: 0,
    },
  };
}

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
