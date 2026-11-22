import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-4xl py-7 pb-28 md:pb-10 sm:py-10 lg:py-12',
        className,
      )}
    >
      {children}
    </div>
  );
}
