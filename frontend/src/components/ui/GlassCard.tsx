import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type GlassCardProps = HTMLAttributes<HTMLDivElement>;

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ className, ...props }, ref) {
    return (
      <div
        className={cn(
          'rounded-[1.75rem] border border-border bg-surface/80 shadow-soft backdrop-blur-2xl',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

GlassCard.displayName = 'GlassCard';
