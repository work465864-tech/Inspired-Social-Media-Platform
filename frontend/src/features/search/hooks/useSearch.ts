'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { searchDebounceMs, searchMinimumLength } from '../constants';
import { searchCacheService } from '../services/searchCacheService';
import { searchService } from '../services/searchService';
import {
  shouldRetrySearch,
  normalizeSearchQuery,
} from '../services/searchUtils';
import type { SearchFilters, SearchTab } from '../types';
import { useDebouncedSearchQuery } from './useDebouncedSearchQuery';
import { useSearchPagination } from './useSearchPagination';

export function useSearch(
  value: string,
  tab: SearchTab,
  filters: SearchFilters,
) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const normalizedValue = normalizeSearchQuery(value);
  const query = useDebouncedSearchQuery(normalizedValue, searchDebounceMs);
  const isDebouncing = normalizedValue !== query;
  const paginationTarget = tab === 'top' ? 'videos' : tab;
  const pagination = useSearchPagination(
    query,
    paginationTarget,
    filters,
    tab !== 'top' && !isDebouncing,
  );
  const topQueryKey = searchCacheService.topKey(userId, query);
  const topRequest = useQuery({
    queryKey: topQueryKey,
    queryFn: ({ signal }) => searchService.searchTop(query, signal),
    enabled: Boolean(
      tab === 'top' &&
      !isDebouncing &&
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
  const items = useMemo(() => {
    if (isDebouncing) {
      return [];
    }
    return tab === 'top' ? (topRequest.data ?? []) : pagination.items;
  }, [isDebouncing, pagination.items, tab, topRequest.data]);

  const activeRequest = tab === 'top' ? topRequest : pagination;
  return {
    query,
    isDebouncing,
    items,
    error: activeRequest.error,
    isError: activeRequest.isError,
    isFetching: activeRequest.isFetching || isDebouncing,
    isLoading: activeRequest.isLoading || isDebouncing,
    hasNextPage: tab !== 'top' && pagination.hasNextPage,
    isFetchingNextPage: tab !== 'top' && pagination.isFetchingNextPage,
    isFetchNextPageError: tab !== 'top' && pagination.isFetchNextPageError,
    fetchNextPage: pagination.fetchNextPage,
    refetch: activeRequest.refetch,
  };
}
