import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type FooterProps = HTMLAttributes<HTMLElement>;

export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-border bg-surface px-4 py-8 text-sm text-muted sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
}
