import { z } from 'zod';

export const CATEGORIES = ['account', 'billing', 'technical', 'access', 'hardware', 'other'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TICKET_STATUSES = ['new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened'] as const;

export const createTicketSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const listTicketsQuerySchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  scope: z.enum(['queue']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const transitionTicketSchema = z.object({
  to: z.enum(TICKET_STATUSES),
});

export type TransitionTicketInput = z.infer<typeof transitionTicketSchema>;

export const assignTicketSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
});

export type AssignTicketInput = z.infer<typeof assignTicketSchema>;

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment body is required').max(5000),
  isInternal: z.boolean().default(false),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
