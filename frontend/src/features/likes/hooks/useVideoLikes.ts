'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import type { Json } from '../../../types/database.types';
import { likeQueryKeys } from '../constants/queryKeys';
import { likeService } from '../services/likeService';
import { reactionService } from '../services/reactionService';
import type { VideoLikeState } from '../types';
import { useVideoLikeRealtime } from './useVideoLikeRealtime';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useVideoLikes(videoId: string, initialCount = 0) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const queryKey = likeQueryKeys.video(videoId, userId);
  const isValidVideoId = uuidPattern.test(videoId);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => likeService.getVideoLikes(videoId, userId, signal),
    initialData: {
      count: Math.max(0, initialCount),
      liked: false,
    },
    initialDataUpdatedAt: 0,
    enabled: isValidVideoId,
    staleTime: 15_000,
    retry: 1,
  });

  const applyChange = useCallback(
    (videoIdFromEvent: string, actorId: string, desiredState: boolean) => {
      if (videoIdFromEvent !== videoId) {
        return;
      }
      queryClient.setQueryData<VideoLikeState>(queryKey, (current) =>
        reactionService.applyRealtimeChange(
          current,
          actorId,
          userId,
          desiredState,
        ),
      );
    },
    [queryClient, queryKey, userId, videoId],
  );
  const handleLikeCreated = useCallback(
    (event: { payload: { videoId: string; userId: string } }) =>
      applyChange(event.payload.videoId, event.payload.userId, true),
    [applyChange],
  );
  const handleLikeRemoved = useCallback(
    (event: { payload: { videoId: string; userId: string } }) =>
      applyChange(event.payload.videoId, event.payload.userId, false),
    [applyChange],
  );
  const handleVideoUpdated = useCallback(
    (event: { payload: { videoId: string; changes: Json } }) => {
      if (event.payload.videoId !== videoId) {
        return;
      }
      const changes = event.payload.changes;
      if (
        typeof changes !== 'object' ||
        changes === null ||
        Array.isArray(changes) ||
        typeof changes.likes_count !== 'number' ||
        !Number.isSafeInteger(changes.likes_count) ||
        changes.likes_count < 0
      ) {
        return;
      }
      const nextCount = changes.likes_count;
      let countChanged = false;
      queryClient.setQueryData<VideoLikeState>(queryKey, (current) => {
        if (!current || current.count === nextCount) {
          return current;
        }
        countChanged = true;
        return { ...current, count: nextCount };
      });
      if (countChanged) {
        void queryClient.invalidateQueries({ queryKey, exact: true });
      }
    },
    [queryClient, queryKey, videoId],
  );

  useVideoLikeRealtime(videoId, isValidVideoId);
  useRealtimeEvent('LIKE_CREATED', handleLikeCreated);
  useRealtimeEvent('LIKE_REMOVED', handleLikeRemoved);
  useRealtimeEvent('VIDEO_UPDATED', handleVideoUpdated);

  return {
    count: query.data.count,
    error: query.error,
    isError: query.isError,
    isLoading: !query.dataUpdatedAt && query.isFetching,
    isReady: query.dataUpdatedAt > 0,
    liked: query.data.liked,
    refetch: query.refetch,
  };
}
