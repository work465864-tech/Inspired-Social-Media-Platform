'use client';

import { Clock3, History, Trash2 } from 'lucide-react';
import type { RecentSearch } from '../types';

type SearchHistoryProps = {
  error?: string | null;
  isClearing: boolean;
  isError: boolean;
  isLoading: boolean;
  items: RecentSearch[];
  onClear: () => void;
  onRetry: () => void;
  onSelect: (query: string) => void;
};

export function SearchHistory({
  error,
  isClearing,
  isError,
  isLoading,
  items,
  onClear,
  onRetry,
  onSelect,
}: SearchHistoryProps) {
  return (
    <section
      aria-labelledby="search-history-title"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          className="flex items-center gap-2 text-base font-semibold text-foreground"
          id="search-history-title"
        >
          <History aria-hidden="true" className="h-4 w-4 text-primary" />
          Recent searches
        </h2>
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-muted transition hover:bg-black/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 dark:hover:bg-white/5"
          disabled={isClearing || items.length === 0}
          onClick={onClear}
          type="button"
        >
          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      {isError ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-danger" role="alert">
            {error ?? 'Search history could not be loaded.'}
          </p>
          <button
            className="min-h-9 rounded-lg px-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onRetry}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <p className="mt-4 text-sm text-muted" role="status">
          Loading recent searches...
        </p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          Searches you submit will appear here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li
              className="flex items-center gap-2 py-1 first:pt-0"
              key={item.id}
            >
              <Clock3
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted"
              />
              <button
                className="min-h-11 min-w-0 flex-1 truncate text-left text-sm text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => onSelect(item.query)}
                type="button"
              >
                {item.query}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
