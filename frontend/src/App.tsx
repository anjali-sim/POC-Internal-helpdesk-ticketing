import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TicketsListPage } from '@/pages/TicketsListPage';
import { NewTicketPage } from '@/pages/NewTicketPage';
import { TicketDetailPage } from '@/pages/TicketDetailPage';
import { QueuePage } from '@/pages/QueuePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/" element={<Navigate to="/tickets" replace />} />
      <Route
        path="/tickets"
        element={
          <AppShell>
            <TicketsListPage />
          </AppShell>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <AppShell>
            <NewTicketPage />
          </AppShell>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <AppShell>
            <TicketDetailPage />
          </AppShell>
        }
      />
      <Route
        path="/queue"
        element={
          <AppShell>
            <QueuePage />
          </AppShell>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AppShell>
            <DashboardPage />
          </AppShell>
        }
      />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Toaster position="top-right" richColors closeButton />
    </BrowserRouter>
  );
}

export default App;
