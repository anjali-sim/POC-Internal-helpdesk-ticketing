import type { ListTicketsParams } from '@/api/tickets';

// Every ticket key starts with `all`, so invalidating that prefix refreshes lists, details and the dashboard.
export const queryKeys = {
  me: ['me'] as const,
  agents: ['agents'] as const,
  tickets: {
    all: ['tickets'] as const,
    list: (params: ListTicketsParams) => ['tickets', 'list', params] as const,
    detail: (id: string) => ['tickets', 'detail', id] as const,
    dashboard: () => ['tickets', 'dashboard'] as const,
  },
};
