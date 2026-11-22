'use client';

import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  hasError?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      hasError = false,
      rows = 4,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) {
    return (
      <textarea
        aria-invalid={hasError || ariaInvalid || undefined}
        className={cn(
          'min-h-24 w-full resize-y rounded-control border bg-surface px-3.5 py-3 text-sm text-foreground outline-none transition-colors duration-fast placeholder:text-muted focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-disabled',
          hasError
            ? 'border-danger focus:border-danger'
            : 'border-border focus:border-primary',
          className,
        )}
        ref={ref}
        rows={rows}
        {...props}
      />
    );
  },
);

Textarea.displayName = 'Textarea';
