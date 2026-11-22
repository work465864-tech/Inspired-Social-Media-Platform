import { searchHistoryLimit } from '../constants';
import type { RecentSearch } from '../types';
import { normalizeSearchQuery } from './searchUtils';

export function mergeRecentSearch(
  current: RecentSearch[] | undefined,
  next: RecentSearch,
): RecentSearch[] {
  const normalized = normalizeSearchQuery(next.query).toLocaleLowerCase();
  const items = (current ?? []).filter(
    (item) =>
      normalizeSearchQuery(item.query).toLocaleLowerCase() !== normalized,
  );
  return [next, ...items].slice(0, searchHistoryLimit);
}
