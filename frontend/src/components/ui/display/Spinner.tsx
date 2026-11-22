import { cn } from '../../../lib/utils';

export type SpinnerProps = {
  label?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const sizes = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

export function Spinner({
  className,
  label = 'Loading',
  size = 'md',
}: SpinnerProps) {
  return (
    <span
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-border border-t-primary motion-reduce:animate-none',
        sizes[size],
        className,
      )}
      role="status"
    />
  );
}
