'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { feedQueryKeys } from '../constants/queryKeys';
import {
  FeedDataError,
  shouldRetryFeedRequest,
} from '../services/errorService';
import { feedService } from '../services/feedService';
import type { FeedCursor, FeedDataPage } from '../types/models';

export type UseFeedPaginationOptions = {
  feedKey?: string;
  pageSize?: number;
};

export function useFeedPagination({
  feedKey = 'for-you',
  pageSize = 12,
}: UseFeedPaginationOptions = {}) {
  return useInfiniteQuery<
    FeedDataPage,
    FeedDataError,
    InfiniteData<FeedDataPage, FeedCursor | null>,
    ReturnType<typeof feedQueryKeys.infinite>,
    FeedCursor | null
  >({
    queryKey: feedQueryKeys.infinite(feedKey, pageSize),
    initialPageParam: null as FeedCursor | null,
    queryFn: ({ pageParam, signal }) =>
      feedService.getPage(pageParam, pageSize, signal),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: 'always',
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
}
