import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const;

const TINTS = [
  'bg-brand-soft text-brand',
  'bg-ok-soft text-ok',
  'bg-warn-soft text-warn',
  'bg-info-soft text-info',
  'bg-danger-soft text-danger',
];

function tintFor(name: string) {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TINTS[hash % TINTS.length];
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        SIZES[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
