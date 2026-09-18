import type { Assignment, Comment, Ticket, TicketTransitionLog, User } from '@prisma/client';

import { toWirePriority, toWireStatus } from './ticket.state-machine';

type TicketWithRelations = Ticket & {
  requester: Pick<User, 'id' | 'name'>;
  assignments: Array<Assignment & { agent: Pick<User, 'id' | 'name'> }>;
};

export function toTicketDto(ticket: TicketWithRelations) {
  const currentAssignment = ticket.assignments.find((a) => a.unassignedAt === null) ?? null;

  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    category: ticket.category,
    priority: toWirePriority(ticket.priority),
    status: toWireStatus(ticket.status),
    requesterId: ticket.requester.id,
    requesterName: ticket.requester.name,
    assigneeId: currentAssignment?.agent.id ?? null,
    assigneeName: currentAssignment?.agent.name ?? null,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    firstRespondedAt: ticket.firstRespondedAt,
    resolvedAt: ticket.resolvedAt,
  };
}

type CommentWithAuthor = Comment & { author: Pick<User, 'id' | 'name' | 'role'> };

export function toCommentDto(comment: CommentWithAuthor) {
  return {
    id: comment.id,
    ticketId: comment.ticketId,
    authorId: comment.author.id,
    authorName: comment.author.name,
    authorRole: comment.author.role,
    body: comment.body,
    isInternal: comment.isInternal,
    createdAt: comment.createdAt,
  };
}

type AssignmentWithAgent = Assignment & { agent: Pick<User, 'id' | 'name'> };

export function toAssignmentDto(assignment: AssignmentWithAgent) {
  return {
    id: assignment.id,
    agentId: assignment.agent.id,
    agentName: assignment.agent.name,
    assignedAt: assignment.assignedAt,
    unassignedAt: assignment.unassignedAt,
  };
}

type TransitionWithActor = TicketTransitionLog & { changedBy: Pick<User, 'id' | 'name'> };

export function toTransitionDto(transition: TransitionWithActor) {
  return {
    id: transition.id,
    fromStatus: transition.fromStatus ? toWireStatus(transition.fromStatus) : null,
    toStatus: toWireStatus(transition.toStatus),
    changedById: transition.changedBy.id,
    changedByName: transition.changedBy.name,
    changedAt: transition.changedAt,
  };
}
