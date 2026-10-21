import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth';
import { commentLimiter, ticketCreateLimiter, writeLimiter } from '../../middleware/rate-limit';
import { validateBody, validateQuery } from '../../middleware/validate';
import {
  addComment,
  assign,
  create,
  dashboard,
  getById,
  list,
  queue,
  transitionStatus,
} from './ticket.controller';
import {
  assignTicketSchema,
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  transitionTicketSchema,
} from './ticket.schema';

export const ticketRouter = Router();

ticketRouter.use(requireAuth);

ticketRouter.post(
  '/',
  ticketCreateLimiter,
  requireRole(Role.REQUESTER),
  validateBody(createTicketSchema),
  create,
);
ticketRouter.get('/', validateQuery(listTicketsQuerySchema), list);
// The agent's own queue: tickets currently assigned to the caller.
ticketRouter.get('/queue', requireRole(Role.AGENT), validateQuery(listTicketsQuerySchema), queue);
// Must be declared before '/:id', otherwise "queue"/"dashboard" are read as ticket ids.
ticketRouter.get('/dashboard', requireRole(Role.AGENT, Role.ADMIN), dashboard);
ticketRouter.get('/:id', getById);
ticketRouter.patch(
  '/:id/status',
  writeLimiter,
  requireRole(Role.AGENT),
  validateBody(transitionTicketSchema),
  transitionStatus,
);
ticketRouter.patch(
  '/:id/assign',
  writeLimiter,
  requireRole(Role.AGENT, Role.ADMIN),
  validateBody(assignTicketSchema),
  assign,
);
// Admins oversee and reassign; they do not take part in the comment thread.
ticketRouter.post(
  '/:id/comments',
  commentLimiter,
  requireRole(Role.REQUESTER, Role.AGENT),
  validateBody(createCommentSchema),
  addComment,
);
