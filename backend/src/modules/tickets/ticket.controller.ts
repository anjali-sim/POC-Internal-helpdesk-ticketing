import type { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '../../lib/errors';
import * as ticketService from './ticket.service';
import type {
  AssignTicketInput,
  CreateCommentInput,
  CreateTicketInput,
  ListTicketsQuery,
  TransitionTicketInput,
} from './ticket.schema';

function requireUser(req: Request) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  return req.user;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const ticket = await ticketService.createTicket(user.id, req.body as CreateTicketInput);
    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await ticketService.listTickets(user, req.validatedQuery as ListTicketsQuery);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await ticketService.getDashboard(user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const result = await ticketService.getTicketById(user, req.params.id as string);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function transitionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const { to } = req.body as TransitionTicketInput;
    const ticket = await ticketService.transitionTicketStatus(user, req.params.id as string, to);
    res.status(200).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function assign(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const ticket = await ticketService.assignTicket(user, req.params.id as string, req.body as AssignTicketInput);
    res.status(200).json({ ticket });
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction) {
  try {
    const user = requireUser(req);
    const comment = await ticketService.addComment(user, req.params.id as string, req.body as CreateCommentInput);
    res.status(201).json({ comment });
  } catch (err) {
    next(err);
  }
}
