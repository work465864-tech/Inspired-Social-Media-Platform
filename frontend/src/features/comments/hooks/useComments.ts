'use client';

import { useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Json } from '../../../types/database.types';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { commentQueryKeys } from '../constants/queryKeys';
import { commentService } from '../services/commentService';
import { extractVideoCommentsCount } from '../services/commentRealtimeService';

export function useComments(videoId: string, enabled = true, initialCount = 0) {
  const queryClient = useQueryClient();
  const queryKey = commentQueryKeys.list(videoId);

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      commentService.getPage(videoId, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled,
    staleTime: 10_000,
    retry: 1,
  });

  const handleVideoUpdated = useCallback(
    (event: { payload: { videoId: string; changes: Json } }) => {
      if (
        event.payload.videoId !== videoId ||
        extractVideoCommentsCount(event.payload.changes) === null
      ) {
        return;
      }

      queryClient
        .invalidateQueries({ queryKey, exact: true })
        .catch((error) => {
          console.error(
            'Failed to refresh comments after a live count change.',
            error,
          );
        });
    },
    [queryClient, queryKey, videoId],
  );
  useRealtimeEvent('VIDEO_UPDATED', handleVideoUpdated);

  const comments = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const totalCount =
    query.data?.pages[0]?.totalCount ?? Math.max(0, initialCount);

  return {
    comments,
    totalCount,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
