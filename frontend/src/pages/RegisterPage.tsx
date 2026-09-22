import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Alert } from '@/components/ui/Feedback';
import { useAuth } from '@/hooks/useAuth';
import { describeError } from '@/lib/error-message';

// Client-side validation is a courtesy; the server enforces the same rules.
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const {
    register: field,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  async function onSubmit(values: RegisterValues) {
    try {
      await registerUser(values);
      // Registration signs you in, so go straight to the ticket list.
      navigate('/tickets', { replace: true });
    } catch (error) {
      setError('root', { message: describeError(error) });
    }
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
            <p className="text-sm text-muted">
              Raise tickets and track them through to resolution.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl2 border border-line bg-surface p-6 shadow-card"
          noValidate
        >
          {errors.root && <Alert tone="danger">{errors.root.message}</Alert>}

          <Input
            label="Full name"
            placeholder="Jordan Lee"
            autoComplete="name"
            error={errors.name?.message}
            {...field('name')}
          />
          <Input
            label="Work email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            error={errors.email?.message}
            {...field('email')}
          />
          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            error={errors.password?.message}
            {...field('password')}
          />

          <Button
            type="submit"
            fullWidth
            isLoading={isSubmitting}
            trailingIcon={<ArrowRight className="size-4" />}
          >
            Create account
          </Button>

          <p className="text-center text-xs text-subtle">
            New accounts are created as requesters. Agent and admin access is granted separately.
          </p>

          <p className="text-center text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
