import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  function Skeleton({ className, ...props }, ref) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          'motion-safe:animate-pulse rounded-control border border-border bg-surface-raised',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';
