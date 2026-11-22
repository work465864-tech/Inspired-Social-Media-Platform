'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  leading?: ReactNode;
  destructive?: boolean;
};

export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(
  function MenuItem(
    {
      children,
      className,
      destructive = false,
      leading,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        className={cn(
          'flex min-h-10 w-full items-center gap-2 rounded-sm px-3 text-left text-sm transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-disabled motion-reduce:transition-none',
          destructive ? 'text-danger' : 'text-foreground',
          className,
        )}
        ref={ref}
        role="menuitem"
        type={type}
        {...props}
      >
        {leading && <span className="shrink-0">{leading}</span>}
        <span className="min-w-0 flex-1">{children}</span>
      </button>
    );
  },
);

MenuItem.displayName = 'MenuItem';
