'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      className={cn(
        'h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-raised accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-disabled',
        className,
      )}
      ref={ref}
      type="range"
    />
  );
});

Slider.displayName = 'Slider';
