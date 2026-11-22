import type { HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Card } from './Card';

export type StatisticCardProps = HTMLAttributes<HTMLDivElement> & {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  detail?: string;
};

export function StatisticCard({
  className,
  detail,
  icon: Icon,
  label,
  value,
  ...props
}: StatisticCardProps) {
  return (
    <Card className={cn('p-5', className)} {...props}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-title font-semibold text-foreground">
            {value}
          </p>
          {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
        </div>
        {Icon && (
          <span className="grid h-10 w-10 place-items-center rounded-control bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </span>
        )}
      </div>
    </Card>
  );
}
