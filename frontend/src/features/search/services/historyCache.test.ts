import { describe, expect, it } from 'vitest';
import { searchHistoryLimit } from '../constants';
import type { RecentSearch } from '../types';
import { mergeRecentSearch } from './historyCache';

describe('search history cache', () => {
  it('moves a repeated query to the front and compares it case-insensitively', () => {
    const current: RecentSearch[] = [
      { id: 1, query: 'Ocean', searchedAt: '2026-01-01T00:00:00Z' },
      { id: 2, query: 'Music', searchedAt: '2026-01-02T00:00:00Z' },
    ];

    expect(
      mergeRecentSearch(current, {
        id: 3,
        query: ' ocean ',
        searchedAt: '2026-01-03T00:00:00Z',
      }),
    ).toEqual([
      { id: 3, query: ' ocean ', searchedAt: '2026-01-03T00:00:00Z' },
      current[1],
    ]);
  });

  it('keeps the history bounded to the configured limit', () => {
    const current = Array.from({ length: searchHistoryLimit }, (_, index) => ({
      id: index,
      query: `query-${index}`,
      searchedAt: '2026-01-01T00:00:00Z',
    }));

    expect(
      mergeRecentSearch(current, {
        id: 99,
        query: 'new query',
        searchedAt: '2026-01-02T00:00:00Z',
      }),
    ).toHaveLength(searchHistoryLimit);
  });
});
