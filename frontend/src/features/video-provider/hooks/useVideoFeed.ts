'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  hybridFeedGcTimeMs,
  hybridFeedStaleTimeMs,
  videoPageSize,
  videoQueryKeys,
} from '../constants';
import { hybridFeedProvider } from '../providers/hybridFeedProvider';
import type { VideoPage } from '../types';
import {
  getVideoRetryDelay,
  shouldRetryVideoRequest,
} from '../services/videoQueryPolicy';
export { updateCachedFeedVideo } from '../services/feedQueryCache';

export function useVideoFeed(enabled = true) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  return useInfiniteQuery({
    queryKey: videoQueryKeys.feed(userId),
    queryFn: ({ pageParam, signal }) =>
      hybridFeedProvider.getPage(
        { kind: 'feed', page: pageParam, pageSize: videoPageSize },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage: VideoPage) => lastPage.nextPage ?? undefined,
    enabled: enabled && !isAuthLoading,
    staleTime: hybridFeedStaleTimeMs,
    gcTime: hybridFeedGcTimeMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: shouldRetryVideoRequest,
    retryDelay: getVideoRetryDelay,
  });
}

export function usePrefetchVideoFeed() {
  const queryClient = useQueryClient();
  const { isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  return () => {
    if (isAuthLoading) {
      return Promise.resolve();
    }
    return queryClient.prefetchInfiniteQuery({
      queryKey: videoQueryKeys.feed(userId),
      queryFn: ({ pageParam, signal }) =>
        hybridFeedProvider.getPage(
          { kind: 'feed', page: pageParam, pageSize: videoPageSize },
          signal,
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage: VideoPage) => lastPage.nextPage ?? undefined,
      staleTime: hybridFeedStaleTimeMs,
      gcTime: hybridFeedGcTimeMs,
    });
  };
}
