import { LifeBuoy } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-surface-2 px-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand">
        <LifeBuoy className="size-6" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Page not found</h1>
        <p className="text-sm text-muted">The page you're looking for doesn't exist.</p>
      </div>
      <LinkButton to="/">Back to Helpdesk</LinkButton>
    </div>
  );
}
