import { z } from 'zod';

// Wire contract with the API; apiRequest validates responses against these schemas.

export const ROLES = ['REQUESTER', 'AGENT', 'ADMIN'] as const;
export const CATEGORIES = [
  'account',
  'billing',
  'technical',
  'access',
  'hardware',
  'other',
] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = [
  'new',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'reopened',
] as const;

export const roleSchema = z.enum(ROLES);
export const prioritySchema = z.enum(PRIORITIES);
export const ticketStatusSchema = z.enum(TICKET_STATUSES);
// Falls back to 'other' so one odd legacy row doesn't fail the whole page parse.
export const categorySchema = z.enum(CATEGORIES).catch('other');

export type Role = z.infer<typeof roleSchema>;
export type Priority = z.infer<typeof prioritySchema>;
export type TicketStatus = z.infer<typeof ticketStatusSchema>;
export type Category = z.infer<typeof categorySchema>;

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
});

export type User = z.infer<typeof userSchema>;

export const ticketSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string(),
  category: categorySchema,
  priority: prioritySchema,
  status: ticketStatusSchema,
  requesterId: z.string(),
  requesterName: z.string(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  firstRespondedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  firstResponseDueAt: z.string().nullable(),
  resolutionDueAt: z.string().nullable(),
  // Business minutes actually taken; null while still pending.
  firstResponseMinutes: z.number().nullable(),
  resolutionMinutes: z.number().nullable(),
});

export type Ticket = z.infer<typeof ticketSchema>;

export const commentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  authorRole: roleSchema,
  body: z.string(),
  isInternal: z.boolean(),
  createdAt: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

export const assignmentSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  agentName: z.string(),
  assignedAt: z.string(),
  unassignedAt: z.string().nullable(),
});

export type Assignment = z.infer<typeof assignmentSchema>;

export const transitionSchema = z.object({
  id: z.string(),
  fromStatus: ticketStatusSchema.nullable(),
  toStatus: ticketStatusSchema,
  changedById: z.string(),
  changedByName: z.string(),
  changedAt: z.string(),
});

export type Transition = z.infer<typeof transitionSchema>;

export const AGE_BUCKETS = ['lt_24h', '1_3d', '3_7d', 'gt_7d'] as const;

export const ageBucketSchema = z.object({
  bucket: z.enum(AGE_BUCKETS),
  count: z.number(),
  breached: z.number(),
  oldestCreatedAt: z.string().nullable(),
});

export type AgeBucket = z.infer<typeof ageBucketSchema>;

export const AGE_BUCKET_LABEL: Record<AgeBucket['bucket'], string> = {
  lt_24h: 'Under 24h',
  '1_3d': '1 – 3 days',
  '3_7d': '3 – 7 days',
  gt_7d: '7 days+',
};

export const dashboardSchema = z.object({
  ageBuckets: z.array(ageBucketSchema),
  sla: z.object({
    openTotal: z.number(),
    unassigned: z.number(),
    firstResponseBreached: z.number(),
    resolutionBreached: z.number(),
  }),
});

export type Dashboard = z.infer<typeof dashboardSchema>;

// Mirrors the server's transition table; only decides which buttons to render.
export const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['assigned'],
  assigned: ['in_progress', 'reopened'],
  in_progress: ['resolved', 'reopened'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress'],
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

export const STATUS_TONE: Record<
  TicketStatus,
  'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'
> = {
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

export const PRIORITY_TONE: Record<
  Priority,
  'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info'
> = {
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

export const ROLE_LABEL: Record<Role, string> = {
  REQUESTER: 'Requester',
  AGENT: 'Agent',
  ADMIN: 'Admin',
};

export function isAgentOrAdmin(role: Role | undefined): boolean {
  return role === 'AGENT' || role === 'ADMIN';
}
