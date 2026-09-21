export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
  }
}

/**
 * Raised by the ticket state machine when a transition is not in the transition
 * table. Distinct from ValidationError so a caller can tell "you sent a state
 * that doesn't exist" (400) apart from "that state exists but you can't get
 * there from here" (422), and so the response can name the legal moves.
 */
export class IllegalTransitionError extends AppError {
  from: string;
  to: string;
  allowedTransitions: string[];

  constructor(from: string, to: string, allowedTransitions: string[]) {
    super(422, 'ILLEGAL_TRANSITION', `Cannot transition ticket from "${from}" to "${to}"`);
    this.from = from;
    this.to = to;
    this.allowedTransitions = allowedTransitions;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
  }
}
