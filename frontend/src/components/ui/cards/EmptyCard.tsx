import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { EmptyState } from '../../shell/EmptyState';
import { Card } from './Card';

export type EmptyCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function EmptyCard({
  action,
  className,
  description,
  icon,
  title,
}: EmptyCardProps) {
  return (
    <Card className={className}>
      <EmptyState
        className="border-0 bg-transparent"
        description={description}
        icon={icon}
        title={title}
      />
      {action && <div className="px-5 pb-5 text-center">{action}</div>}
    </Card>
  );
}
