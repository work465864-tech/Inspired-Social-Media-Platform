import { cn } from '../../../lib/utils';

export type ProgressProps = {
  value: number;
  max?: number;
  label: string;
  className?: string;
  variant?: 'primary' | 'success' | 'danger';
};

const colors = {
  primary: 'bg-primary',
  success: 'bg-success',
  danger: 'bg-danger',
} as const;

export function Progress({
  className,
  label,
  max = 100,
  value,
  variant = 'primary',
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const normalizedValue = Math.min(safeMax, Math.max(0, value));
  const percentage = (normalizedValue / safeMax) * 100;

  return (
    <div
      aria-label={label}
      aria-valuemax={safeMax}
      aria-valuemin={0}
      aria-valuenow={normalizedValue}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-surface-raised',
        className,
      )}
      role="progressbar"
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-normal motion-reduce:transition-none',
          colors[variant],
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
