'use client';

import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  videoQueryGcTimeMs,
  videoQueryKeys,
  videoQueryStaleTimeMs,
} from '../constants';
import { videoApiClient } from '../services/videoApiClient';
import {
  getVideoRetryDelay,
  shouldRetryVideoRequest,
} from '../services/videoQueryPolicy';

export function useTrendingVideos(enabled = true) {
  return useInfiniteQuery({
    queryKey: videoQueryKeys.trending,
    queryFn: ({ pageParam, signal }) =>
      videoApiClient.getPage('trending', pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled,
    staleTime: videoQueryStaleTimeMs,
    gcTime: videoQueryGcTimeMs,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryVideoRequest,
    retryDelay: getVideoRetryDelay,
  });
}

export function usePrefetchTrendingVideos() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.prefetchInfiniteQuery({
      queryKey: videoQueryKeys.trending,
      queryFn: ({ pageParam, signal }) =>
        videoApiClient.getPage('trending', pageParam, signal),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      pages: 2,
      staleTime: videoQueryStaleTimeMs,
      gcTime: videoQueryGcTimeMs,
    });
}
