import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type CardVariant = 'default' | 'raised' | 'interactive';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variants: Record<CardVariant, string> = {
  default: 'bg-surface',
  raised: 'bg-surface-raised shadow-sm',
  interactive:
    'bg-surface transition-colors hover:border-primary/35 hover:bg-surface-raised motion-reduce:transition-none',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = 'default', ...props },
  ref,
) {
  return (
    <div
      className={cn(
        'rounded-card border border-border',
        variants[variant],
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Card.displayName = 'Card';
