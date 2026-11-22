import type { ReactNode } from 'react';

export type FeedbackBoundaryProps = {
  children: ReactNode;
  className?: string;
};

export function FeedbackBoundary({
  children,
  className,
}: FeedbackBoundaryProps) {
  return (
    <div aria-live="polite" className={className} role="status">
      {children}
    </div>
  );
}
