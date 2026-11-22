import { LoaderCircle } from 'lucide-react';
import { forwardRef } from 'react';
import Button, { type ButtonProps } from './Button';

export type LoadingButtonProps = ButtonProps & {
  loading?: boolean;
  loadingLabel?: string;
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    { children, disabled, loading = false, loadingLabel = 'Loading', ...props },
    ref,
  ) {
    return (
      <Button
        aria-busy={loading}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 motion-safe:animate-spin motion-reduce:animate-none"
          />
        )}
        {loading ? loadingLabel : children}
      </Button>
    );
  },
);

LoadingButton.displayName = 'LoadingButton';
