'use client';

import type {
  SearchFilters as SearchFilterState,
  SearchTarget,
} from '../types';

type SearchFiltersProps = {
  filters: SearchFilterState;
  onChange: (filters: SearchFilterState) => void;
  target: SearchTarget;
};

export function SearchFilters({
  filters,
  onChange,
  target,
}: SearchFiltersProps) {
  if (target === 'people') {
    return (
      <div className="flex justify-end">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            checked={filters.verifiedOnly}
            className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onChange={(event) =>
              onChange({
                ...filters,
                verifiedOnly: event.currentTarget.checked,
              })
            }
            type="checkbox"
          />
          Verified creators
        </label>
      </div>
    );
  }

  if (target === 'videos') {
    return (
      <div className="flex items-center justify-end gap-2">
        <label className="text-sm text-muted" htmlFor="search-video-sort">
          Sort
        </label>
        <select
          className="min-h-10 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          id="search-video-sort"
          onChange={(event) =>
            onChange({
              ...filters,
              videoSort: event.currentTarget
                .value as SearchFilterState['videoSort'],
            })
          }
          value={filters.videoSort}
        >
          <option value="recent">Most recent</option>
          <option value="popular">Most viewed</option>
        </select>
      </div>
    );
  }

  return null;
}
