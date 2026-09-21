import { useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/api/auth';
import { AuthContext, type AuthContextValue } from '@/hooks/useAuth';
import { queryKeys } from '@/lib/query-keys';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // "Who am I" is a server question since the cookie is httpOnly.
  const { data: user, isPending } = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.fetchMe,
    staleTime: Infinity,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (nextUser) => {
      queryClient.setQueryData(queryKeys.me, nextUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Drop all cached data — the next user shouldn't see the last one's.
      queryClient.removeQueries();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });

  const { mutateAsync: loginAsync } = loginMutation;
  const { mutateAsync: registerAsync } = registerMutation;
  const { mutateAsync: logoutAsync } = logoutMutation;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading: isPending,
      login: (input) => loginAsync(input),
      register: (input) => registerAsync(input),
      logout: () => logoutAsync(),
    }),
    [user, isPending, loginAsync, registerAsync, logoutAsync],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
