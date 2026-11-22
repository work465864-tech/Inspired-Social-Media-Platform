import { ChevronDown } from 'lucide-react';
import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type PopoverProps = Omit<
  DetailsHTMLAttributes<HTMLDetailsElement>,
  'children'
> & {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
};

export function Popover({
  align = 'start',
  children,
  className,
  trigger,
  ...props
}: PopoverProps) {
  return (
    <details
      className={cn('group relative inline-block', className)}
      {...props}
    >
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        {trigger}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className={cn(
          'absolute top-[calc(100%+0.5rem)] z-[var(--z-dropdown)] min-w-56 rounded-card border border-border bg-surface-raised p-4 shadow-lg',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        {children}
      </div>
    </details>
  );
}
