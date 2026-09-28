import { asyncHandler } from '../../lib/async-handler';
import { requireUser } from '../../middleware/auth';
import * as ticketService from './ticket.service';
import type {
  AssignTicketInput,
  CreateCommentInput,
  CreateTicketInput,
  ListTicketsQuery,
  TransitionTicketInput,
} from './ticket.schema';

export const create = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const ticket = await ticketService.createTicket(user.id, req.body as CreateTicketInput);
  res.status(201).json({ ticket });
});

export const list = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const result = await ticketService.listTickets(user, req.validatedQuery as ListTicketsQuery);
  res.status(200).json(result);
});

export const dashboard = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const result = await ticketService.getDashboard(user);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const result = await ticketService.getTicketById(user, req.params.id as string);
  res.status(200).json(result);
});

export const transitionStatus = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { to } = req.body as TransitionTicketInput;
  const ticket = await ticketService.transitionTicketStatus(user, req.params.id as string, to);
  res.status(200).json({ ticket });
});

export const assign = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const ticket = await ticketService.assignTicket(
    user,
    req.params.id as string,
    req.body as AssignTicketInput,
  );
  res.status(200).json({ ticket });
});

export const addComment = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const comment = await ticketService.addComment(
    user,
    req.params.id as string,
    req.body as CreateCommentInput,
  );
  res.status(201).json({ comment });
});
