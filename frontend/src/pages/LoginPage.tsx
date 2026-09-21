import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, LifeBuoy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';
import { describeError } from '@/lib/error-message';

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Accounts created by `prisma db seed`, offered as one-click prefill. */
const SEED_ACCOUNTS = [
  { label: 'Admin', email: 'admin@helpdesk.test', hint: 'Full visibility across every agent' },
  { label: 'Agent', email: 'agent1@helpdesk.test', hint: 'Work a queue, assign and resolve' },
] as const;

const SEED_PASSWORD = 'Password123!';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const {
    register: field,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/tickets';

  async function onSubmit(values: LoginValues) {
    try {
      await login(values);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      // Bad email/password are indistinguishable, so this is a form-level error.
      setError('root', { message: describeError(error) });
    }
  }

  function applySeedAccount(email: string) {
    setValue('email', email, { shouldValidate: true });
    setValue('password', SEED_PASSWORD, { shouldValidate: true });
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
            <p className="text-sm text-muted">Use your work email and password.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {errors.root && <Alert tone="danger">{errors.root.message}</Alert>}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              error={errors.email?.message}
              {...field('email')}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...field('password')}
            />

            <Button
              type="submit"
              fullWidth
              isLoading={isSubmitting}
              trailingIcon={<ArrowRight className="size-4" />}
            >
              Sign in
            </Button>

            <div className="space-y-2 border-t border-line pt-4">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                Seeded accounts
              </p>
              <div className="flex gap-2">
                {SEED_ACCOUNTS.map((account) => (
                  <button
                    type="button"
                    key={account.email}
                    onClick={() => applySeedAccount(account.email)}
                    title={account.hint}
                    className="flex-1 rounded-lg border border-line px-3 py-2 text-left text-xs transition hover:border-line-strong hover:bg-surface-2"
                  >
                    <span className="block font-medium text-fg">{account.label}</span>
                    <span className="block truncate text-subtle">{account.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-subtle">
                Requesters sign up through registration -- the seed only creates staff.
              </p>
            </div>

            <p className="text-center text-sm text-muted">
              New requester?{' '}
              <Link to="/register" className="font-medium text-brand hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
