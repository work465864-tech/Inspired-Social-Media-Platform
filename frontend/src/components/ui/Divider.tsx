import { forwardRef, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type DividerProps = {
  children?: ReactNode;
  className?: string;
};

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  function Divider({ children = 'or continue with', className }, ref) {
    return (
      <div
        aria-label={typeof children === 'string' ? children : 'Section divider'}
        className={cn('flex items-center gap-3 text-xs text-muted', className)}
        ref={ref}
        role="separator"
      >
        <span className="h-px flex-1 bg-border" />
        <span>{children}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
    );
  },
);

Divider.displayName = 'Divider';
