import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'brand' | 'ok' | 'warn' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-line',
  brand: 'bg-brand-soft text-brand border-brand/20',
  ok: 'bg-ok-soft text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/25',
  danger: 'bg-danger-soft text-danger border-danger/20',
  info: 'bg-info-soft text-info border-info/20',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-subtle',
  brand: 'bg-brand',
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Badge({ tone = 'neutral', children, dot = false, className, size = 'sm' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} aria-hidden />}
      {children}
    </span>
  );
}
