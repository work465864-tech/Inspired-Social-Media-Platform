import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type StatusBadgeStatus =
  'online' | 'offline' | 'away' | 'busy' | 'verified';

export type StatusBadgeProps = {
  status: StatusBadgeStatus;
  label?: string;
  className?: string;
};

const defaults: Record<StatusBadgeStatus, string> = {
  online: 'Online',
  offline: 'Offline',
  away: 'Away',
  busy: 'Busy',
  verified: 'Verified',
};

const colors: Record<StatusBadgeStatus, string> = {
  online: 'bg-success',
  offline: 'bg-muted',
  away: 'bg-warning',
  busy: 'bg-danger',
  verified: 'bg-info',
};

export function StatusBadge({ className, label, status }: StatusBadgeProps) {
  const text = label ?? defaults[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground',
        className,
      )}
      title={text}
    >
      {status === 'verified' ? (
        <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-info" />
      ) : (
        <span
          aria-hidden="true"
          className={cn('h-2 w-2 rounded-full', colors[status])}
        />
      )}
      {text}
    </span>
  );
}
