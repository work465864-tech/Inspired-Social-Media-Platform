import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../../lib/utils';

type AuthFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function AuthFooter({ children, className, ...props }: AuthFooterProps) {
  return (
    <div
      className={cn('mt-7 text-center text-sm text-muted', className)}
      {...props}
    >
      {children}
    </div>
  );
}
