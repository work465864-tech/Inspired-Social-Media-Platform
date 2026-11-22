'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { className, selected = false, type = 'button', ...props },
  ref,
) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        'inline-flex min-h-9 items-center justify-center rounded-pill border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-disabled motion-reduce:transition-none',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface text-muted hover:bg-surface-raised hover:text-foreground',
        className,
      )}
      ref={ref}
      type={type}
      {...props}
    />
  );
});

Chip.displayName = 'Chip';
