'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { likeQueryKeys } from '../constants/queryKeys';
import { reactionService } from '../services/reactionService';
import { LikeServiceError } from '../services/likeService';
import type { VideoLikeState } from '../types';

type LikeVariables = {
  videoId: string;
  userId: string;
};

function useLikeMutation(desiredState: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useOptimisticMutation<
    boolean,
    LikeServiceError,
    LikeVariables
  >({
    mutationKey: ['likes', desiredState ? 'like' : 'unlike'],
    mutationFn: ({ videoId, userId }) =>
      reactionService.setLiked(videoId, userId, desiredState),
    dedupeKey: ({ videoId, userId }) =>
      `${desiredState ? 'like' : 'unlike'}:${userId}:${videoId}`,
    optimisticUpdate: ({ videoId, userId }, transaction) => {
      transaction.update<VideoLikeState>(
        likeQueryKeys.video(videoId, userId),
        (current) => reactionService.optimisticState(current, desiredState),
      );
    },
    invalidate: (_data, _error, { videoId, userId }) => [
      { queryKey: likeQueryKeys.video(videoId, userId) },
      { queryKey: feedQueryKeys.all },
    ],
    retry: false,
  });
  const { mutate, error, isPending } = mutation;

  const changeLike = useCallback(
    (videoId: string): boolean => {
      const userId = user?.id;
      if (!userId) {
        return false;
      }

      const current = queryClient.getQueryData<VideoLikeState>(
        likeQueryKeys.video(videoId, userId),
      );
      if (current?.liked === desiredState) {
        return false;
      }

      mutate({ videoId, userId });
      return true;
    },
    [desiredState, mutate, queryClient, user?.id],
  );

  return {
    changeLike,
    error,
    isPending,
  };
}

export function useLike() {
  const mutation = useLikeMutation(true);
  return {
    like: mutation.changeLike,
    error: mutation.error,
    isPending: mutation.isPending,
  };
}

export function useUnlike() {
  const mutation = useLikeMutation(false);
  return {
    unlike: mutation.changeLike,
    error: mutation.error,
    isPending: mutation.isPending,
  };
}
