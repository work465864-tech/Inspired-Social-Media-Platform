'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  label?: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, ...props }, ref) {
    const input = (
      <input
        {...props}
        className={cn(
          'h-4 w-4 shrink-0 rounded border-border text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-disabled',
          className,
        )}
        ref={ref}
        type="checkbox"
      />
    );

    return label ? (
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
        {input}
        <span>{label}</span>
      </label>
    ) : (
      input
    );
  },
);

Checkbox.displayName = 'Checkbox';
