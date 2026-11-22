'use client';

import { Search } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../../lib/utils';
import Input, { type InputProps } from '../Input';

export type SearchInputProps = Omit<InputProps, 'type'>;

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      'aria-label': ariaLabel = 'Search',
      className,
      placeholder = 'Search',
      ...props
    },
    ref,
  ) {
    return (
      <span className="relative block">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        />
        <Input
          {...props}
          aria-label={ariaLabel}
          className={cn('pl-10', className)}
          placeholder={placeholder}
          ref={ref}
          type="search"
        />
      </span>
    );
  },
);

SearchInput.displayName = 'SearchInput';
