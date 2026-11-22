import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type EmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-dashed border-border bg-surface/60 p-5 text-center',
        className,
      )}
    >
      <span className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}
