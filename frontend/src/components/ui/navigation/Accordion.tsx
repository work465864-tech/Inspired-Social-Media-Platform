import type { DetailsHTMLAttributes, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export type AccordionProps = Omit<
  DetailsHTMLAttributes<HTMLDetailsElement>,
  'children'
> & {
  title: ReactNode;
  children: ReactNode;
};

export function Accordion({
  children,
  className,
  title,
  ...props
}: AccordionProps) {
  return (
    <details
      className={cn('group border-b border-border last:border-b-0', className)}
      {...props}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-4 text-sm leading-6 text-muted">{children}</div>
    </details>
  );
}
