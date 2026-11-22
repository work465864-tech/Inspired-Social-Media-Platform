import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type BadgeVariant =
  'primary' | 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  neutral: 'bg-surface-raised text-muted',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant = 'primary', ...props },
  ref,
) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Badge.displayName = 'Badge';
