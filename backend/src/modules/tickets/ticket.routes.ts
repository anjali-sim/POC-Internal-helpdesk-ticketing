import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireAuth, requireRole } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validate';
import { addComment, assign, create, dashboard, getById, list, transitionStatus } from './ticket.controller';
import {
  assignTicketSchema,
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  transitionTicketSchema,
} from './ticket.schema';

export const ticketRouter = Router();

ticketRouter.use(requireAuth);

ticketRouter.post('/', requireRole(Role.REQUESTER), validateBody(createTicketSchema), create);
ticketRouter.get('/', validateQuery(listTicketsQuerySchema), list);
// Must be declared before '/:id', otherwise "dashboard" is read as a ticket id.
ticketRouter.get('/dashboard', requireRole(Role.AGENT, Role.ADMIN), dashboard);
ticketRouter.get('/:id', getById);
ticketRouter.patch(
  '/:id/status',
  requireRole(Role.AGENT, Role.ADMIN),
  validateBody(transitionTicketSchema),
  transitionStatus,
);
ticketRouter.patch('/:id/assign', requireRole(Role.AGENT, Role.ADMIN), validateBody(assignTicketSchema), assign);
ticketRouter.post('/:id/comments', validateBody(createCommentSchema), addComment);
