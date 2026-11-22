import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type SectionProps = HTMLAttributes<HTMLElement> & {
  spacing?: 'sm' | 'md' | 'lg';
};

const spacing = {
  sm: 'py-4 sm:py-6',
  md: 'py-6 sm:py-8 lg:py-10',
  lg: 'py-8 sm:py-12 lg:py-16',
} as const;

export function Section({
  className,
  spacing: spacingSize = 'md',
  ...props
}: SectionProps) {
  return <section className={cn(spacing[spacingSize], className)} {...props} />;
}
