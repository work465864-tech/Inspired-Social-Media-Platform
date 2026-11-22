import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type ContentContainerProps = {
  children: ReactNode;
  className?: string;
};

export function ContentContainer({
  children,
  className,
}: ContentContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-[1500px] grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_20rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}
