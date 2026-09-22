import { z } from 'zod';
import { apiRequest } from '@/lib/api-client';
import {
  assignmentSchema,
  commentSchema,
  dashboardSchema,
  ticketSchema,
  transitionSchema,
  type Category,
  type Comment,
  type Dashboard,
  type Priority,
  type Ticket,
  type TicketStatus,
} from '@/types/ticket';

const ticketResponseSchema = z.object({ ticket: ticketSchema });
const commentResponseSchema = z.object({ comment: commentSchema });

const ticketListSchema = z.object({
  items: z.array(ticketSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export type TicketList = z.infer<typeof ticketListSchema>;

const ticketDetailSchema = z.object({
  ticket: ticketSchema,
  comments: z.array(commentSchema),
  assignments: z.array(assignmentSchema),
  transitions: z.array(transitionSchema),
});

export type TicketDetail = z.infer<typeof ticketDetailSchema>;

export interface ListTicketsParams {
  status?: TicketStatus;
  priority?: Priority;
  category?: Category;
  /** `queue` = assigned to me right now; `open` = not resolved or closed. */
  scope?: 'queue' | 'open';
  page?: number;
  pageSize?: number;
}

// Filtering, ordering and paging all happen in Postgres; rows come back oldest-first.
export function listTickets(params: ListTicketsParams = {}): Promise<TicketList> {
  return apiRequest('/tickets', ticketListSchema, { query: { ...params } });
}

export function getTicket(id: string): Promise<TicketDetail> {
  return apiRequest(`/tickets/${id}`, ticketDetailSchema);
}

export interface CreateTicketInput {
  subject: string;
  description: string;
  category: Category;
  priority: Priority;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const { ticket } = await apiRequest('/tickets', ticketResponseSchema, {
    method: 'POST',
    body: input,
  });
  return ticket;
}

// Illegal moves get a 422 ILLEGAL_TRANSITION from the server.
export async function transitionTicket(id: string, to: TicketStatus): Promise<Ticket> {
  const { ticket } = await apiRequest(`/tickets/${id}/status`, ticketResponseSchema, {
    method: 'PATCH',
    body: { to },
  });
  return ticket;
}

export async function assignTicket(id: string, agentId: string): Promise<Ticket> {
  const { ticket } = await apiRequest(`/tickets/${id}/assign`, ticketResponseSchema, {
    method: 'PATCH',
    body: { agentId },
  });
  return ticket;
}

export interface AddCommentInput {
  body: string;
  isInternal: boolean;
}

export async function addComment(id: string, input: AddCommentInput): Promise<Comment> {
  const { comment } = await apiRequest(`/tickets/${id}/comments`, commentResponseSchema, {
    method: 'POST',
    body: input,
  });
  return comment;
}

/** Age buckets and SLA counts, aggregated in SQL -- no ticket rows crossing the wire. */
export function getDashboard(): Promise<Dashboard> {
  return apiRequest('/tickets/dashboard', dashboardSchema);
}
