import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, hasError = false, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  return (
    <input
      aria-invalid={hasError || ariaInvalid || undefined}
      className={cn(
        'min-h-12 w-full rounded-control border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors duration-fast placeholder:text-muted focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
        hasError
          ? 'border-red-500 focus:border-red-500'
          : 'border-border focus:border-primary',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export default Input;
