'use client';

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { searchMinimumLength, searchPageSize } from '../constants';
import { searchCacheService } from '../services/searchCacheService';
import { searchService } from '../services/searchService';
import { shouldRetrySearch } from '../services/searchUtils';
import type {
  SearchFilters,
  SearchPage,
  SearchPageCursor,
  SearchResult,
  SearchTarget,
} from '../types';
import { SearchError } from '../services/searchUtils';
import type { SearchCacheService } from '../services/searchCacheService';

export function useSearchPagination(
  query: string,
  target: SearchTarget,
  filters: SearchFilters,
  enabled = true,
) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const queryKey = searchCacheService.resultKey(userId, query, target, filters);
  const request = useInfiniteQuery<
    SearchPage,
    SearchError,
    InfiniteData<SearchPage, SearchPageCursor | null>,
    ReturnType<SearchCacheService['resultKey']>,
    SearchPageCursor | null
  >({
    queryKey,
    initialPageParam: null as SearchPageCursor | null,
    queryFn: ({ pageParam, signal }) =>
      userId
        ? searchService.searchPage(
            query,
            target,
            pageParam,
            filters,
            searchPageSize,
            signal,
          )
        : Promise.reject(
            new SearchError('unauthorized', 'Sign in to search Connectly.'),
          ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(
      enabled &&
      query.length >= searchMinimumLength &&
      userId &&
      isAuthenticated &&
      !isAuthLoading,
    ),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetrySearch,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });

  return {
    ...request,
    items:
      request.data?.pages.flatMap((page) => page.items) ??
      ([] as SearchResult[]),
  };
}
