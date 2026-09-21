import { QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError, isUnauthorized } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Drop cached identity on 401 so the route guard sends the user to /login.
      if (isUnauthorized(error)) {
        queryClient.setQueryData(queryKeys.me, null);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // 4xx answers are deliberate -- retrying a 403 just repeats it.
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
