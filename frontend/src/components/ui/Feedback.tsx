import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type AlertTone = 'info' | 'ok' | 'warn' | 'danger';

const ALERT_TONES: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: { wrapper: 'bg-info-soft border-info/25 text-info', icon: <Info className="size-4" /> },
  ok: { wrapper: 'bg-ok-soft border-ok/25 text-ok', icon: <CheckCircle2 className="size-4" /> },
  warn: { wrapper: 'bg-warn-soft border-warn/30 text-warn', icon: <AlertTriangle className="size-4" /> },
  danger: { wrapper: 'bg-danger-soft border-danger/25 text-danger', icon: <XCircle className="size-4" /> },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { wrapper, icon } = ALERT_TONES[tone];
  return (
    <div role="alert" className={cn('flex gap-3 rounded-lg border p-3 text-sm', wrapper, className)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-fg/80">{children}</div>}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-line bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <span className="flex size-11 items-center justify-center rounded-full bg-surface-2 text-subtle">
          {icon}
        </span>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
