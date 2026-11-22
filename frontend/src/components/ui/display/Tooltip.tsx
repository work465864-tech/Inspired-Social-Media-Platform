import { cloneElement, useId, type ReactElement } from 'react';
import { cn } from '../../../lib/utils';

type TooltipTriggerProps = {
  'aria-describedby'?: string;
};

export type TooltipProps = {
  children: ReactElement<TooltipTriggerProps>;
  content: string;
  className?: string;
};

export function Tooltip({ children, className, content }: TooltipProps) {
  const tooltipId = useId();
  const describedBy = [children.props['aria-describedby'], tooltipId]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cn('group relative inline-flex', className)}>
      {cloneElement(children, { 'aria-describedby': describedBy })}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-[var(--z-tooltip)] mb-2 w-max max-w-56 -translate-x-1/2 rounded-sm bg-surface-raised px-2.5 py-1.5 text-xs text-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
        id={tooltipId}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}
