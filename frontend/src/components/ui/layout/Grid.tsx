import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6;

export type GridProps = HTMLAttributes<HTMLDivElement> & {
  columns?: GridColumns;
  gap?: 'sm' | 'md' | 'lg';
};

const columns: Record<GridColumns, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6',
};

const gaps = {
  sm: 'gap-3',
  md: 'gap-4 sm:gap-5',
  lg: 'gap-6 sm:gap-8',
} as const;

export function Grid({
  className,
  columns: columnCount = 3,
  gap = 'md',
  ...props
}: GridProps) {
  return (
    <div
      className={cn('grid', columns[columnCount], gaps[gap], className)}
      {...props}
    />
  );
}
