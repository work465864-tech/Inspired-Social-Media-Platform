import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type IconProps = {
  icon: LucideIcon;
  label?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
};

const sizes = {
  xs: 'h-[var(--icon-size-xs)] w-[var(--icon-size-xs)]',
  sm: 'h-[var(--icon-size-sm)] w-[var(--icon-size-sm)]',
  md: 'h-[var(--icon-size-md)] w-[var(--icon-size-md)]',
  lg: 'h-[var(--icon-size-lg)] w-[var(--icon-size-lg)]',
  xl: 'h-[var(--icon-size-xl)] w-[var(--icon-size-xl)]',
} as const;

export function Icon({
  className,
  icon: IconComponent,
  label,
  size = 'md',
}: IconProps) {
  return (
    <IconComponent
      aria-hidden={!label}
      aria-label={label}
      className={cn(sizes[size], className)}
      role={label ? 'img' : undefined}
    />
  );
}
