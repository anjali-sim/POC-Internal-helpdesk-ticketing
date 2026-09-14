export type Role = 'requester' | 'agent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type TicketStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type Category = 'account' | 'billing' | 'technical' | 'access' | 'hardware' | 'other';

/**
 * The single source of truth for legal moves. Every mutation (mock store here,
 * the real API later) must consult this map instead of branching on state in
 * route handlers -- that's what makes an illegal transition rejectable at one
 * choke point instead of scattered `if`s.
 */
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['assigned'],
  assigned: ['in_progress', 'reopened'],
  in_progress: ['resolved', 'reopened'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress'],
};

export function isLegalTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

export const STATUS_TONE: Record<TicketStatus, 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'> = {
  new: 'info',
  assigned: 'brand',
  in_progress: 'warn',
  resolved: 'ok',
  closed: 'neutral',
  reopened: 'danger',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const PRIORITY_TONE: Record<Priority, 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'> = {
  low: 'neutral',
  medium: 'info',
  high: 'warn',
  urgent: 'danger',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  account: 'Account',
  billing: 'Billing',
  technical: 'Technical',
  access: 'Access request',
  hardware: 'Hardware',
  other: 'Other',
};

export const SLA_TARGET_MINUTES: Record<Priority, { firstResponse: number; resolution: number }> = {
  urgent: { firstResponse: 30, resolution: 4 * 60 },
  high: { firstResponse: 60, resolution: 8 * 60 },
  medium: { firstResponse: 4 * 60, resolution: 24 * 60 },
  low: { firstResponse: 8 * 60, resolution: 72 * 60 },
};

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: Category;
  priority: Priority;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: Category;
  priority: Priority;
  status: TicketStatus;
  requesterId: string;
  requesterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
}

export interface Comment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export type AuditEventType =
  | 'created'
  | 'assigned'
  | 'reassigned'
  | 'status_changed'
  | 'comment_added';

export interface AuditEvent {
  id: string;
  ticketId: string;
  type: AuditEventType;
  fromValue: string | null;
  toValue: string | null;
  actorId: string;
  actorName: string;
  createdAt: string;
}
