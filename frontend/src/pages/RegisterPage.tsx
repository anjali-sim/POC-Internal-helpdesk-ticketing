import { useNavigate } from 'react-router-dom';
import { ArrowRight, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
export function RegisterPage() {
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate('/tickets', { replace: true });
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-surface-2 px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <LifeBuoy className="size-5" />
          </span>
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">Create your account</h2>
            <p className="text-sm text-muted">Raise tickets and track them through to resolution.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl2 border border-line bg-surface p-6 shadow-card">
          <Input label="Full name" placeholder="Jordan Lee" required />
          <Input label="Work email" type="email" placeholder="you@company.com" required />
          <Input label="Password" type="password" placeholder="At least 8 characters" required minLength={8} />

          <Button type="submit" fullWidth trailingIcon={<ArrowRight className="size-4" />}>
            Create account
          </Button>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-brand hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
