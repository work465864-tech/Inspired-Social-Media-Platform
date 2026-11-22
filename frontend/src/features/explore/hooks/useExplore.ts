'use client';

import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { shouldRetryFeedRequest } from '../../feed/services/errorService';
import { explorePageSize } from '../constants';
import { exploreQueryKeys } from '../constants/queryKeys';
import { exploreService } from '../services/exploreService';
import type {
  ExploreCategorySlug,
  ExploreVideoCursor,
  ExploreVideoPage,
} from '../types';
import { useTrendingVideos } from './useTrendingVideos';

export function useExplore(category: ExploreCategorySlug) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const recent = useInfiniteQuery<
    ExploreVideoPage,
    Error,
    InfiniteData<ExploreVideoPage, ExploreVideoCursor | null>,
    ReturnType<typeof exploreQueryKeys.videos>,
    ExploreVideoCursor | null
  >({
    queryKey: exploreQueryKeys.videos(category, 'recent'),
    initialPageParam: null,
    queryFn: ({ pageParam, signal }) =>
      exploreService.getVideoPage(
        'recent',
        category,
        pageParam,
        signal,
        explorePageSize,
      ),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
  const trendingVideos = useTrendingVideos(category);
  const popularThisWeek = useTrendingVideos(category, 'popular');

  return {
    recent,
    recentItems: recent.data?.pages.flatMap((page) => page.items) ?? [],
    trendingVideos: trendingVideos.items,
    trendingVideosQuery: trendingVideos,
    popularThisWeek: popularThisWeek.items,
    popularThisWeekQuery: popularThisWeek,
    isAuthLoading,
  };
}
