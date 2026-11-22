'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  recommendationPageSize,
  recommendationStaleTimeMs,
} from '../constants';
import { recommendationQueryKeys } from '../constants/queryKeys';
import { shouldRetryFeedRequest } from '../../feed/services/errorService';
import { recommendationService } from '../services/recommendationService';
import type { RecommendationCursor, RecommendationPage } from '../types';

export function useForYouFeed(pageSize = recommendationPageSize) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;

  return useInfiniteQuery<
    RecommendationPage,
    Error,
    InfiniteData<RecommendationPage, RecommendationCursor | null>,
    ReturnType<typeof recommendationQueryKeys.forYou>,
    RecommendationCursor | null
  >({
    queryKey: recommendationQueryKeys.forYou(userId ?? 'anonymous', pageSize),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) => {
      if (!userId) {
        throw new Error('Sign in to load your For You recommendations.');
      }
      return recommendationService.getPage(userId, pageParam, signal, pageSize);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: recommendationStaleTimeMs,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: 'always',
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
}
