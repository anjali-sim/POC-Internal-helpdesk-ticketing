import { isApiError } from '@/lib/api-client';
import { STATUS_LABEL, type TicketStatus } from '@/types/ticket';

// Illegal transitions get special-cased so the toast names the moves that were legal.
export function describeError(error: unknown): string {
  if (!isApiError(error)) {
    return error instanceof Error ? error.message : 'Something went wrong';
  }

  if (error.illegalTransition) {
    const { from, to, allowedTransitions } = error.illegalTransition;
    const label = (status: string) => STATUS_LABEL[status as TicketStatus] ?? status;
    const allowed =
      allowedTransitions.length > 0
        ? `Allowed from ${label(from)}: ${allowedTransitions.map(label).join(', ')}.`
        : `${label(from)} is a terminal state.`;
    return `Server rejected ${label(from)} → ${label(to)}. ${allowed}`;
  }

  return error.message;
}
