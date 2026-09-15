import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function TableShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'scrollbar-thin overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card',
        className,
      )}
    >
      <table className="w-full min-w-[46rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-2/60">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-muted uppercase',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TR({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn('transition hover:bg-surface-2/70', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-3 align-middle text-fg', className)} {...props}>
      {children}
    </td>
  );
}
