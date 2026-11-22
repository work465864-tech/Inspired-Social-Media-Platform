'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { searchHistoryLimit } from '../constants';
import { searchCacheService } from '../services/searchCacheService';
import { mergeRecentSearch } from '../services/historyCache';
import { historyService } from '../services/historyService';
import { normalizeSearchQuery, SearchError } from '../services/searchUtils';
import type { RecentSearch } from '../types';

type RecordSearchVariables = {
  query: string;
};

export function useSearchHistory() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const queryKey = searchCacheService.historyKey(userId);
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      userId
        ? historyService.getRecent(userId, signal)
        : Promise.reject(
            new SearchError(
              'unauthorized',
              'Sign in to access search history.',
            ),
          ),
    initialData: [] as RecentSearch[],
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const recordMutation = useOptimisticMutation<
    RecentSearch,
    SearchError,
    RecordSearchVariables
  >({
    mutationKey: ['search', 'history', 'record'],
    mutationFn: ({ query: value }) =>
      userId
        ? historyService.record(userId, value)
        : Promise.reject(
            new SearchError(
              'unauthorized',
              'Sign in to access search history.',
            ),
          ),
    optimisticUpdate: ({ query: value }, transaction) => {
      const timestamp = new Date().toISOString();
      transaction.update<RecentSearch[]>(queryKey, (current) =>
        mergeRecentSearch(current, {
          id: -Date.now(),
          query: value,
          searchedAt: timestamp,
        }),
      );
    },
    onSuccess: (savedSearch) => {
      queryClient.setQueryData<RecentSearch[]>(queryKey, (current) =>
        mergeRecentSearch(current, savedSearch),
      );
    },
    invalidate: () => [{ queryKey }],
    retry: false,
  });

  const clearMutation = useOptimisticMutation<void, SearchError, void>({
    mutationKey: ['search', 'history', 'clear'],
    mutationFn: () =>
      userId
        ? historyService.clear(userId)
        : Promise.reject(
            new SearchError(
              'unauthorized',
              'Sign in to access search history.',
            ),
          ),
    optimisticUpdate: (_variables, transaction) => {
      transaction.update<RecentSearch[]>(queryKey, () => []);
    },
    onSuccess: () => {
      queryClient.setQueryData<RecentSearch[]>(queryKey, []);
    },
    invalidate: () => [{ queryKey }],
    retry: false,
  });

  const { mutateAsync: recordAsync } = recordMutation;
  const { mutateAsync: clearAsync } = clearMutation;
  const recordSearch = useCallback(
    async (value: string) => {
      if (!userId || !isAuthenticated) {
        throw new SearchError(
          'unauthorized',
          'Sign in to save search history.',
        );
      }
      const normalized = normalizeSearchQuery(value);
      if (normalized.length < 1 || normalized.length > 200) {
        throw new SearchError('validation', 'The search term is invalid.');
      }
      await recordAsync({ query: normalized });
    },
    [isAuthenticated, recordAsync, userId],
  );
  const clearHistory = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      throw new SearchError('unauthorized', 'Sign in to clear search history.');
    }
    await clearAsync();
  }, [clearAsync, isAuthenticated, userId]);

  return {
    clearHistory,
    error: recordMutation.error ?? clearMutation.error ?? query.error,
    isClearing: clearMutation.isPending,
    isError: query.isError,
    isLoading: isAuthLoading || (!query.dataUpdatedAt && query.isFetching),
    isRecording: recordMutation.isPending,
    recent: query.data.slice(0, searchHistoryLimit),
    recordSearch,
    refetch: query.refetch,
  };
}
