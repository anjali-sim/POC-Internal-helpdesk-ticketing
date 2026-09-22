import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { RedirectIfAuthed, RequireAuth } from '@/components/RouteGuards';
import { AuthProvider } from '@/components/AuthProvider';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TicketsListPage } from '@/pages/TicketsListPage';
import { NewTicketPage } from '@/pages/NewTicketPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { QueuePage } from '@/pages/QueuePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import type { ReactNode } from 'react';
import type { Role } from '@/types/ticket';

function Protected({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  return (
    <RequireAuth roles={roles}>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}

const AGENT_ROLES: Role[] = ['AGENT', 'ADMIN'];

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route path="/" element={<Navigate to="/tickets" replace />} />
      <Route
        path="/tickets"
        element={
          <Protected>
            <TicketsListPage />
          </Protected>
        }
      />
      {/* Raising a ticket is requester-only on the server (requireRole(REQUESTER)). */}
      <Route
        path="/tickets/new"
        element={
          <Protected roles={['REQUESTER']}>
            <NewTicketPage />
          </Protected>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <Protected>
            <TicketDetailPage />
          </Protected>
        }
      />
      <Route
        path="/queue"
        element={
          <Protected roles={AGENT_ROLES}>
            <QueuePage />
          </Protected>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Protected roles={AGENT_ROLES}>
            <DashboardPage />
          </Protected>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}

export default App;
