'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { searchCacheService } from '../services/searchCacheService';
import { shouldRetrySearch } from '../services/searchUtils';
import { trendingService } from '../services/trendingService';

export function useTrendingSearches() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: searchCacheService.trendingKey(userId),
    queryFn: ({ signal }) => trendingService.getTrendingSearches(signal),
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetrySearch,
  });

  return {
    ...query,
    items: query.data ?? [],
  };
}
