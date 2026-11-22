'use client';

import {
  forwardRef,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '../../../lib/utils';

export type OTPInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  label?: string;
  className?: string;
};

export const OTPInput = forwardRef<HTMLInputElement, OTPInputProps>(
  function OTPInput(
    {
      className,
      disabled = false,
      hasError = false,
      label = 'One-time code',
      length = 6,
      onChange,
      value,
    },
    forwardedRef,
  ) {
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const slotCount = Math.max(1, Math.min(12, Math.floor(length)));

    function assignRef(index: number, node: HTMLInputElement | null) {
      inputRefs.current[index] = node;
      if (index === 0) {
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      }
    }

    function updateFrom(index: number, text: string) {
      const characters = text.replace(/\D/g, '').slice(0, slotCount - index);
      if (!characters) {
        const next = value.split('');
        next[index] = '';
        onChange(next.join('').slice(0, slotCount));
        return;
      }

      const next = Array.from(
        { length: slotCount },
        (_, slot) => value[slot] ?? '',
      );
      [...characters].forEach((character, offset) => {
        next[index + offset] = character;
      });
      onChange(next.join(''));
      inputRefs.current[
        Math.min(index + characters.length, slotCount - 1)
      ]?.focus();
    }

    function handlePaste(
      index: number,
      event: ClipboardEvent<HTMLInputElement>,
    ) {
      const pastedValue = event.clipboardData
        .getData('text')
        .replace(/\D/g, '');
      if (!pastedValue) {
        return;
      }

      event.preventDefault();
      updateFrom(index, pastedValue);
    }

    function handleKeyDown(
      index: number,
      event: KeyboardEvent<HTMLInputElement>,
    ) {
      if (event.key === 'Backspace' && !value[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        inputRefs.current[index - 1]?.focus();
      } else if (event.key === 'ArrowRight' && index < slotCount - 1) {
        event.preventDefault();
        inputRefs.current[index + 1]?.focus();
      }
    }

    return (
      <div
        aria-label={label}
        className={cn('flex flex-wrap gap-2 sm:gap-3', className)}
        role="group"
      >
        {Array.from({ length: slotCount }, (_, index) => (
          <input
            aria-invalid={hasError || undefined}
            aria-label={`Digit ${index + 1} of ${slotCount}`}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            className={cn(
              'h-12 w-10 rounded-control border bg-surface text-center text-lg font-semibold text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-disabled sm:h-14 sm:w-12',
              hasError ? 'border-danger' : 'border-border',
            )}
            disabled={disabled}
            inputMode="numeric"
            key={index}
            maxLength={slotCount}
            onChange={(event) => updateFrom(index, event.currentTarget.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            ref={(node) => assignRef(index, node)}
            type="text"
            value={value[index] ?? ''}
          />
        ))}
      </div>
    );
  },
);

OTPInput.displayName = 'OTPInput';
