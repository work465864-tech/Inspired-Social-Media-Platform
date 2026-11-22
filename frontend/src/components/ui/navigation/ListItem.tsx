import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';

export type ListItemProps = HTMLAttributes<HTMLLIElement> & {
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function ListItem({
  children,
  className,
  leading,
  trailing,
  ...props
}: ListItemProps) {
  return (
    <li
      className={cn(
        'flex min-h-11 items-center gap-3 border-b border-border py-2.5 last:border-b-0',
        className,
      )}
      {...props}
    >
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing && <span className="shrink-0">{trailing}</span>}
    </li>
  );
}
