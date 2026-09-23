import { Priority, Role, TicketStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  agent,
  assignedTo,
  buildAssignment,
  buildComment,
  buildTicket,
  buildUser,
  ticketWithRelations,
} from '../../factories';
import {
  toAssignmentDto,
  toCommentDto,
  toTicketDto,
  toTransitionDto,
} from '../../../modules/tickets/ticket.mapper';

describe('toTicketDto', () => {
  it('flattens the requester and maps enums onto the wire vocabulary', () => {
    const ticket = buildTicket({ priority: Priority.URGENT, status: TicketStatus.IN_PROGRESS });
    const dto = toTicketDto(ticketWithRelations(ticket));

    expect(dto).toMatchObject({
      id: ticket.id,
      subject: ticket.subject,
      priority: 'urgent',
      status: 'in_progress',
      requesterId: ticket.requesterId,
      requesterName: 'Rita Requester',
    });
  });

  it('never leaks the requester relation object itself', () => {
    const dto = toTicketDto(ticketWithRelations());
    expect(dto).not.toHaveProperty('requester');
    expect(dto).not.toHaveProperty('assignments');
  });

  it('reports no assignee when the ticket has never been assigned', () => {
    const dto = toTicketDto(ticketWithRelations(buildTicket(), []));

    expect(dto.assigneeId).toBeNull();
    expect(dto.assigneeName).toBeNull();
  });

  it('surfaces the open assignment', () => {
    const alex = agent();
    const dto = toTicketDto(ticketWithRelations(buildTicket(), [assignedTo(alex)]));

    expect(dto.assigneeId).toBe(alex.id);
    expect(dto.assigneeName).toBe('Alex Agent');
  });

  it('ignores closed assignments after a reassignment', () => {
    const first = buildUser({ id: 'agent_first', name: 'First Agent', role: Role.AGENT });
    const second = buildUser({ id: 'agent_second', name: 'Second Agent', role: Role.AGENT });
    const dto = toTicketDto(
      ticketWithRelations(buildTicket(), [
        assignedTo(first, { unassignedAt: new Date('2026-01-05T11:00:00.000Z') }),
        assignedTo(second),
      ]),
    );

    expect(dto.assigneeId).toBe('agent_second');
  });

  it('reports no assignee when every assignment has been closed', () => {
    const dto = toTicketDto(
      ticketWithRelations(buildTicket(), [
        assignedTo(agent(), { unassignedAt: new Date('2026-01-05T11:00:00.000Z') }),
      ]),
    );

    expect(dto.assigneeId).toBeNull();
  });

  it('leaves elapsed SLA minutes null while nothing has happened yet', () => {
    const dto = toTicketDto(ticketWithRelations(buildTicket()));

    expect(dto.firstResponseMinutes).toBeNull();
    expect(dto.resolutionMinutes).toBeNull();
  });

  it('computes elapsed business minutes once responded and resolved', () => {
    // Local-time dates so the business-hours calendar is timezone independent.
    const createdAt = new Date(2026, 0, 5, 10);
    const dto = toTicketDto(
      ticketWithRelations(
        buildTicket({
          createdAt,
          firstRespondedAt: new Date(2026, 0, 5, 10, 45),
          resolvedAt: new Date(2026, 0, 6, 10),
        }),
      ),
    );

    expect(dto.firstResponseMinutes).toBe(45);
    // 10:00->18:00 Monday plus 09:00->10:00 Tuesday: the night does not count.
    expect(dto.resolutionMinutes).toBe(9 * 60);
  });

  it('passes the stored due dates through unchanged', () => {
    const ticket = buildTicket();
    const dto = toTicketDto(ticketWithRelations(ticket));

    expect(dto.firstResponseDueAt).toBe(ticket.firstResponseDueAt);
    expect(dto.resolutionDueAt).toBe(ticket.resolutionDueAt);
  });
});

describe('toCommentDto', () => {
  it('flattens the author and keeps the internal flag', () => {
    const comment = buildComment({ isInternal: true });
    const dto = toCommentDto({
      ...comment,
      author: { id: 'user_a', name: 'Alex Agent', role: Role.AGENT },
    });

    expect(dto).toEqual({
      id: comment.id,
      ticketId: comment.ticketId,
      authorId: 'user_a',
      authorName: 'Alex Agent',
      authorRole: Role.AGENT,
      body: comment.body,
      isInternal: true,
      createdAt: comment.createdAt,
    });
  });

  it('does not expose the author relation', () => {
    const comment = buildComment();
    const dto = toCommentDto({ ...comment, author: { id: 'user_a', name: 'A', role: Role.AGENT } });

    expect(dto).not.toHaveProperty('author');
  });
});

describe('toAssignmentDto', () => {
  it('flattens the agent', () => {
    const assignment = buildAssignment();
    const dto = toAssignmentDto({ ...assignment, agent: { id: 'user_a', name: 'Alex Agent' } });

    expect(dto).toEqual({
      id: assignment.id,
      agentId: 'user_a',
      agentName: 'Alex Agent',
      assignedAt: assignment.assignedAt,
      unassignedAt: null,
    });
  });
});

describe('toTransitionDto', () => {
  const base = {
    id: 'log_1',
    ticketId: 'ticket_1',
    changedById: 'user_a',
    changedAt: new Date('2026-01-05T10:05:00.000Z'),
    changedBy: { id: 'user_a', name: 'Alex Agent' },
  };

  it('maps both statuses onto wire values', () => {
    const dto = toTransitionDto({
      ...base,
      fromStatus: TicketStatus.NEW,
      toStatus: TicketStatus.IN_PROGRESS,
    });

    expect(dto).toMatchObject({
      fromStatus: 'new',
      toStatus: 'in_progress',
      changedByName: 'Alex Agent',
    });
  });

  it('keeps fromStatus null for the creation entry', () => {
    const dto = toTransitionDto({ ...base, fromStatus: null, toStatus: TicketStatus.NEW });

    expect(dto.fromStatus).toBeNull();
    expect(dto.toStatus).toBe('new');
  });
});
