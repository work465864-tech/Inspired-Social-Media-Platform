'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { searchMinimumLength, suggestionDebounceMs } from '../constants';
import { searchCacheService } from '../services/searchCacheService';
import { suggestionService } from '../services/suggestionService';
import {
  shouldRetrySearch,
  normalizeSearchQuery,
} from '../services/searchUtils';
import { useDebouncedSearchQuery } from './useDebouncedSearchQuery';

export function useSearchSuggestions(value: string, enabled: boolean) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const normalizedValue = normalizeSearchQuery(value);
  const query = useDebouncedSearchQuery(normalizedValue, suggestionDebounceMs);
  const isDebouncing = normalizedValue !== query;
  const request = useQuery({
    queryKey: searchCacheService.suggestionKey(userId, query),
    queryFn: ({ signal }) => suggestionService.getSuggestions(query, signal),
    enabled: Boolean(
      enabled &&
      !isDebouncing &&
      query.length >= searchMinimumLength &&
      userId &&
      isAuthenticated &&
      !isAuthLoading,
    ),
    staleTime: 20_000,
    gcTime: 2 * 60_000,
    retry: shouldRetrySearch,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
  });

  return {
    ...request,
    isDebouncing,
    items: request.data ?? [],
  };
}
