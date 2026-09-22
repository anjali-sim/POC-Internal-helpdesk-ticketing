import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';
import type { Role } from '@/types/ticket';

function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-2">
      <Spinner />
    </div>
  );
}

// Convenience only -- the server re-enforces via requireAuth/requireRole.
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/tickets" replace />;

  return <>{children}</>;
}

/** Keeps a signed-in user off /login and /register. */
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (user) return <Navigate to="/tickets" replace />;

  return <>{children}</>;
}
