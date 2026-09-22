import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as ticketsApi from '@/api/tickets';
import { listAgents } from '@/api/users';
import { describeError } from '@/lib/error-message';
import { queryKeys } from '@/lib/query-keys';
import type { TicketStatus } from '@/types/ticket';

export function useTicketList(params: ticketsApi.ListTicketsParams) {
  return useQuery({
    queryKey: queryKeys.tickets.list(params),
    queryFn: () => ticketsApi.listTickets(params),
    // Keeps the last page visible while paging/filtering swaps the key.
    placeholderData: keepPreviousData,
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id ?? ''),
    queryFn: () => ticketsApi.getTicket(id as string),
    enabled: Boolean(id),
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.tickets.dashboard(),
    queryFn: ticketsApi.getDashboard,
  });
}

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: listAgents,
    // Staff list barely moves; no reason to refetch it per ticket opened.
    staleTime: 5 * 60_000,
  });
}

// Invalidating the shared `tickets` prefix refreshes the ticket, its lists, and the dashboard.
function useInvalidateTickets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
}

export function useCreateTicket() {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: ticketsApi.createTicket,
    onSuccess: () => {
      void invalidate();
      toast.success('Ticket created');
    },
    onError: (error) => toast.error(describeError(error)),
  });
}

export function useTransitionTicket(ticketId: string) {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (to: TicketStatus) => ticketsApi.transitionTicket(ticketId, to),
    onSuccess: (ticket) => {
      void invalidate();
      toast.success(`Ticket moved to ${ticket.status.replace('_', ' ')}`);
    },
    // Surfaces the server's own refusal reason.
    onError: (error) => toast.error(describeError(error)),
  });
}

export function useAssignTicket(ticketId: string) {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (agentId: string) => ticketsApi.assignTicket(ticketId, agentId),
    onSuccess: (ticket) => {
      void invalidate();
      toast.success(
        ticket.assigneeName ? `Assigned to ${ticket.assigneeName}` : 'Assignment updated',
      );
    },
    onError: (error) => toast.error(describeError(error)),
  });
}

export function useAddComment(ticketId: string) {
  const invalidate = useInvalidateTickets();
  return useMutation({
    mutationFn: (input: ticketsApi.AddCommentInput) => ticketsApi.addComment(ticketId, input),
    onSuccess: (comment) => {
      void invalidate();
      toast.success(comment.isInternal ? 'Internal note added' : 'Reply posted');
    },
    onError: (error) => toast.error(describeError(error)),
  });
}
