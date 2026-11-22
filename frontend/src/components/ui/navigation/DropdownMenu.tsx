'use client';

import { ChevronDown } from 'lucide-react';
import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { cn } from '../../../lib/utils';

export type DropdownMenuProps = {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
  className?: string;
  align?: 'start' | 'end';
};

export function DropdownMenu({
  align = 'start',
  children,
  className,
  label,
  trigger,
}: DropdownMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeAfterSelection(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest('[role="menuitem"]') &&
      detailsRef.current
    ) {
      detailsRef.current.open = false;
    }
  }

  function closeOnEscape(event: KeyboardEvent<HTMLDetailsElement>) {
    if (event.key === 'Escape' && detailsRef.current?.open) {
      event.preventDefault();
      detailsRef.current.open = false;
      detailsRef.current.querySelector('summary')?.focus();
    }
  }

  return (
    <details
      className={cn('group relative inline-block', className)}
      onKeyDown={closeOnEscape}
      ref={detailsRef}
    >
      <summary
        aria-haspopup="menu"
        className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"
      >
        {trigger}
        <span className="sr-only">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div
        className={cn(
          'absolute top-[calc(100%+0.5rem)] z-[var(--z-dropdown)] min-w-48 rounded-card border border-border bg-surface p-1.5 shadow-lg',
          align === 'end' ? 'right-0' : 'left-0',
        )}
        onClick={closeAfterSelection}
        role="menu"
      >
        {children}
      </div>
    </details>
  );
}
