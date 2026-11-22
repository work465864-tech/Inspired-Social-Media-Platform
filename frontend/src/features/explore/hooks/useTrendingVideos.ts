'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { shouldRetryFeedRequest } from '../../feed/services/errorService';
import { exploreQueryKeys } from '../constants/queryKeys';
import { discoveryService } from '../services/discoveryService';
import type { ExploreCategorySlug } from '../types';

export function useTrendingVideos(
  category: ExploreCategorySlug,
  sort: 'trending' | 'popular' = 'trending',
) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const query = useQuery({
    queryKey: exploreQueryKeys.videos(category, sort),
    queryFn: ({ signal }) =>
      sort === 'trending'
        ? discoveryService.getTrendingVideos(category, signal)
        : discoveryService.getPopularThisWeek(category, signal),
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });

  return { ...query, items: query.data ?? [] };
}
