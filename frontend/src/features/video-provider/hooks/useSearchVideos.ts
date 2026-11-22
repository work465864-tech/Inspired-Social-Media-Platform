'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import {
  minimumVideoSearchLength,
  videoQueryGcTimeMs,
  videoQueryKeys,
  videoQueryStaleTimeMs,
} from '../constants';
import { videoApiClient } from '../services/videoApiClient';
import {
  getVideoRetryDelay,
  shouldRetryVideoRequest,
} from '../services/videoQueryPolicy';

export function useSearchVideos(query: string) {
  const normalizedQuery = query.trim();

  return useInfiniteQuery({
    queryKey: videoQueryKeys.search(normalizedQuery),
    queryFn: ({ pageParam, signal }) =>
      videoApiClient.getPage('search', pageParam, signal, normalizedQuery),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: normalizedQuery.length >= minimumVideoSearchLength,
    staleTime: videoQueryStaleTimeMs,
    gcTime: videoQueryGcTimeMs,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryVideoRequest,
    retryDelay: getVideoRetryDelay,
  });
}
