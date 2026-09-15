import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'size-4', md: 'size-5', lg: 'size-8' } as const;

export function Spinner({ label, className, size = 'md' }: SpinnerProps) {
  return (
    <div className={cn('flex items-center gap-3 text-muted', className)} role="status">
      <Loader2 className={cn('animate-spin', SIZES[size])} aria-hidden />
      {label ? <span className="text-sm">{label}</span> : <span className="sr-only">Loading</span>}
    </div>
  );
}

export function LoadingPanel({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-60 items-center justify-center rounded-xl2 border border-line bg-surface">
      <Spinner label={label} />
    </div>
  );
}
