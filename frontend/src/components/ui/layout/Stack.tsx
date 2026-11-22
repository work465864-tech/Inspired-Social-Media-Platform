import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type StackProps = HTMLAttributes<HTMLDivElement> & {
  direction?: 'horizontal' | 'vertical';
  gap?: 'none' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'between' | 'end';
  wrap?: boolean;
};

const gaps = {
  none: 'gap-0',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
} as const;

const alignments = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
} as const;

const justifications = {
  start: 'justify-start',
  center: 'justify-center',
  between: 'justify-between',
  end: 'justify-end',
} as const;

export function Stack({
  align = 'stretch',
  className,
  direction = 'vertical',
  gap = 'md',
  justify = 'start',
  wrap = false,
  ...props
}: StackProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'horizontal' ? 'flex-row' : 'flex-col',
        gaps[gap],
        alignments[align],
        justifications[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    />
  );
}
