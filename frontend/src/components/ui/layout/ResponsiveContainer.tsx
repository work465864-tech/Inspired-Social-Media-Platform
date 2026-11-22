import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type ResponsiveContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type ResponsiveContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: ResponsiveContainerSize;
};

const sizes: Record<ResponsiveContainerSize, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-[1500px]',
  full: 'max-w-none',
};

export function ResponsiveContainer({
  className,
  size = 'xl',
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
