'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type SwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: ReactNode;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { className, label, ...props },
  ref,
) {
  const input = (
    <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
      <input
        {...props}
        className={cn('peer sr-only', className)}
        ref={ref}
        role="switch"
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas peer-disabled:opacity-disabled motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
      />
    </span>
  );

  return label ? (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
      {input}
      <span>{label}</span>
    </label>
  ) : (
    input
  );
});

Switch.displayName = 'Switch';
