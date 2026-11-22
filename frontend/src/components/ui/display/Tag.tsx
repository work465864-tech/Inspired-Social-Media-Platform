import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type TagProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'outline' | 'accent';
};

const variants = {
  default: 'border-transparent bg-surface-raised text-muted',
  outline: 'border-border bg-transparent text-foreground',
  accent: 'border-transparent bg-accent/10 text-accent',
} as const;

export function Tag({ className, variant = 'default', ...props }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-1 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
