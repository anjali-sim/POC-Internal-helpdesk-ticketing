import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Inbox, LayoutDashboard, LifeBuoy, ListChecks, LogOut, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { Button, LinkButton } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { isAgent, ROLE_LABEL, type Role } from '@/types/ticket';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="size-4" />,
    roles: ['AGENT'],
  },
  {
    to: '/queue',
    label: 'My queue',
    icon: <Inbox className="size-4" />,
    roles: ['AGENT'],
  },
  { to: '/tickets', label: 'All tickets', icon: <ListChecks className="size-4" /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // AppShell only renders behind RequireAuth, so a user is always present.
  if (!user) return null;

  const navItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(user.role));
  const canRaiseTicket = user.role === 'REQUESTER';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh bg-surface-2">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 sm:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <LifeBuoy className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-fg">Helpdesk</span>
        </div>

        {canRaiseTicket && (
          <LinkButton
            to="/tickets/new"
            size="sm"
            className="mb-4"
            leadingIcon={<Plus className="size-4" />}
          >
            New ticket
          </LinkButton>
        )}

        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/tickets'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3 border-t border-line pt-3">
          <div className="flex items-center gap-2.5 px-2">
            <Avatar name={user.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{user.name}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            className="justify-start"
            leadingIcon={<LogOut className="size-4" />}
            onClick={() => void handleLogout()}
          >
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <LifeBuoy className="size-4" />
            </span>
            <span className="text-sm font-semibold text-fg">Helpdesk</span>
          </div>
          <div className="flex items-center gap-2">
            {isAgent(user.role) && (
              <NavLink to="/queue" className="text-xs font-medium text-muted">
                Queue
              </NavLink>
            )}
            <Avatar name={user.name} size="sm" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
