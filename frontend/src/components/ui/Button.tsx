import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-fg shadow-sm hover:brightness-110 active:brightness-95 disabled:hover:brightness-100',
  secondary:
    'bg-surface-2 text-fg border border-line hover:border-line-strong hover:bg-surface disabled:hover:bg-surface-2',
  outline:
    'border border-line-strong text-fg hover:bg-surface-2 disabled:hover:bg-transparent',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg disabled:hover:bg-transparent',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110 disabled:hover:brightness-100',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-9.5 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-sm gap-2 rounded-xl',
};

const BASE =
  'inline-flex items-center justify-center font-medium whitespace-nowrap transition ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leadingIcon,
    trailingIcon,
    fullWidth,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonClasses(variant, size, cn(fullWidth && 'w-full', className))}
      {...props}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {!isLoading && trailingIcon}
    </button>
  );
});

export interface LinkButtonProps extends LinkProps {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
}

/** A router link that looks and behaves like a Button. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...props}>
      {leadingIcon}
      {children}
    </Link>
  );
}
