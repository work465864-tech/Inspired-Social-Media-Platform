'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Json } from '../../../types/database.types';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { commentQueryKeys } from '../constants/queryKeys';
import { commentService } from '../services/commentService';
import { extractVideoCommentsCount } from '../services/commentRealtimeService';
import { useCommentRealtime } from './useCommentRealtime';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useVideoCommentsCount(videoId: string, initialCount = 0) {
  const queryClient = useQueryClient();
  const queryKey = commentQueryKeys.count(videoId);
  const isValidVideoId = uuidPattern.test(videoId);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => commentService.getCount(videoId, signal),
    initialData: Math.max(0, initialCount),
    initialDataUpdatedAt: 0,
    enabled: isValidVideoId,
    staleTime: 15_000,
    retry: 1,
  });

  const handleVideoUpdated = useCallback(
    (event: { payload: { videoId: string; changes: Json } }) => {
      if (event.payload.videoId !== videoId) {
        return;
      }
      const count = extractVideoCommentsCount(event.payload.changes);
      if (count === null) {
        return;
      }
      queryClient.setQueryData<number>(queryKey, count);
    },
    [queryClient, queryKey, videoId],
  );

  useCommentRealtime(videoId, isValidVideoId);
  useRealtimeEvent('VIDEO_UPDATED', handleVideoUpdated);

  return {
    count: query.data,
    error: query.error,
    isError: query.isError,
    isLoading: !query.dataUpdatedAt && query.isFetching,
    isReady: query.dataUpdatedAt > 0,
    refetch: query.refetch,
  };
}
