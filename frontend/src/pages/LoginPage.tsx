import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { USERS } from '@/data/seed';
import type { Role } from '@/types/ticket';

const ROLE_COPY: Record<Role, string> = {
  requester: 'Raise and track your own tickets',
  agent: 'Work your queue, assign and resolve',
  admin: 'Full visibility across every agent',
};

export function LoginPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(USERS[0].id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate('/tickets', { replace: true });
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand via-[#5a46e8] to-[#2f2372] px-12 py-12 text-white lg:flex">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 size-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <LifeBuoy className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Helpdesk</span>
        </div>

        <div className="relative space-y-6">
          <h1 className="max-w-md text-4xl font-semibold tracking-tight text-balance">
            Every request tracked. Nothing lost in chat.
          </h1>
          <p className="max-w-sm text-sm text-white/75">
            Tickets move through an enforced workflow, agents work a real queue, and every state
            change leaves a trace -- so nothing sits waiting because nobody noticed.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <ShieldCheck className="size-4" />
            Illegal state transitions are rejected server-side, always.
          </div>
        </div>

        <p className="relative text-xs text-white/50">Internal Helpdesk &amp; Ticketing POC</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1.5 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">Sign in</h2>
            <p className="text-sm text-muted">Pick a demo account to explore each role.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email" type="email" placeholder="you@company.com" defaultValue={USERS.find((u) => u.id === selected)?.email} required />
            <Input label="Password" type="password" placeholder="••••••••" defaultValue="demo-password" required />

            <div className="space-y-2">
              <p className="text-sm font-medium text-fg">Demo account</p>
              <div className="space-y-2">
                {USERS.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setSelected(u.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      selected === u.id
                        ? 'border-brand bg-brand-soft'
                        : 'border-line hover:border-line-strong hover:bg-surface-2'
                    }`}
                  >
                    <Avatar name={u.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg">{u.name}</span>
                      <span className="block truncate text-xs text-muted">{ROLE_COPY[u.role]}</span>
                    </span>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted capitalize">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" fullWidth trailingIcon={<ArrowRight className="size-4" />}>
              Sign in
            </Button>

            <p className="text-center text-sm text-muted">
              New requester?{' '}
              <a href="/register" className="font-medium text-brand hover:underline">
                Create an account
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
