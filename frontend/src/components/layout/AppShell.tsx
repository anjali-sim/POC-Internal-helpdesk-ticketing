import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Inbox, LayoutDashboard, LifeBuoy, ListChecks, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import { LinkButton } from '@/components/ui/Button';
import { AGENTS } from '@/data/seed';

const CURRENT_USER = AGENTS[0];

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
  { to: '/queue', label: 'My queue', icon: <Inbox className="size-4" /> },
  { to: '/tickets', label: 'All tickets', icon: <ListChecks className="size-4" /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-surface-2">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-4 sm:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <LifeBuoy className="size-4.5" />
          </span>
          <span className="text-sm font-semibold tracking-tight text-fg">Helpdesk</span>
        </div>

        <LinkButton to="/tickets/new" size="sm" className="mb-4" leadingIcon={<Plus className="size-4" />}>
          New ticket
        </LinkButton>

        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition',
                  isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
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
            <Avatar name={CURRENT_USER.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{CURRENT_USER.name}</p>
              <p className="truncate text-xs text-muted capitalize">{CURRENT_USER.role}</p>
            </div>
          </div>
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
          <Avatar name={CURRENT_USER.name} size="sm" />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
