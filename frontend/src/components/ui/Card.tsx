import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn('rounded-xl2 border border-line bg-surface shadow-card', className)}>
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-sm font-semibold tracking-tight text-fg">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'warn' | 'danger' | 'ok';
}

const TILE_TONES = {
  default: 'text-fg',
  warn: 'text-warn',
  danger: 'text-danger',
  ok: 'text-ok',
} as const;

export function StatTile({ label, value, hint, icon, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <p className={cn('mt-2 text-2xl font-semibold tracking-tight tabular-nums', TILE_TONES[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
