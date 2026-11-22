'use client';

import { Search } from 'lucide-react';
import type { SearchSuggestion } from '../types';

type SearchSuggestionsProps = {
  activeIndex: number;
  error?: string | null;
  id: string;
  isLoading?: boolean;
  items: SearchSuggestion[];
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: SearchSuggestion) => void;
};

export function SearchSuggestions({
  activeIndex,
  error,
  id,
  isLoading = false,
  items,
  onActiveIndexChange,
  onSelect,
}: SearchSuggestionsProps) {
  if (!isLoading && items.length === 0 && !error) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {isLoading && items.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted" role="status">
          Searching suggestions...
        </p>
      )}
      {error && (
        <p className="px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <ul
        aria-label="Search suggestions"
        className="max-h-80 overflow-y-auto p-2"
        id={id}
        role="listbox"
      >
        {items.map((item, index) => (
          <li key={item.id} role="presentation">
            <button
              aria-selected={activeIndex === index}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                activeIndex === index
                  ? 'bg-primary/10 text-foreground'
                  : 'text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              id={`${id}-option-${index}`}
              onClick={() => onSelect(item)}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              type="button"
            >
              <Search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {item.label}
              </span>
              <span className="shrink-0 truncate text-xs text-muted">
                {item.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
