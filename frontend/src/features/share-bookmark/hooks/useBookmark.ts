'use client';

import { useCallback } from 'react';
import {
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import type { BookmarkPage } from '../types';
import { bookmarkQueryKeys } from '../constants/queryKeys';
import {
  BookmarkServiceError,
  bookmarkService,
  removeBookmarkedVideo,
} from '../services/bookmarkService';
import { useBookmarkRealtime } from './useBookmarkRealtime';

type ToggleVariables = {
  videoId: string;
  userId: string;
  desiredState: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useBookmark(videoId: string) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const queryKey = bookmarkQueryKeys.video(videoId, userId);
  const isValidVideoId = uuidPattern.test(videoId);

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      userId
        ? bookmarkService.getState(videoId, userId, signal)
        : Promise.reject(
            new BookmarkServiceError(
              'unauthorized',
              'Sign in to save videos to your bookmarks.',
            ),
          ),
    initialData: false,
    initialDataUpdatedAt: 0,
    enabled: isValidVideoId && isAuthenticated && !isAuthLoading,
    staleTime: 15_000,
    retry: 1,
  });
  const {
    data: currentBookmarkState,
    dataUpdatedAt,
    error: queryError,
    isError: queryIsError,
    isFetching,
    refetch,
  } = query;

  const mutation = useOptimisticMutation<
    boolean,
    BookmarkServiceError,
    ToggleVariables
  >({
    mutationKey: ['bookmarks', 'toggle'],
    mutationFn: ({
      videoId: targetVideoId,
      userId: targetUserId,
      desiredState,
    }) =>
      bookmarkService.setBookmarked(targetVideoId, targetUserId, desiredState),
    dedupeKey: ({ videoId: targetVideoId, userId: targetUserId }) =>
      `${targetUserId}:${targetVideoId}`,
    optimisticUpdate: (
      { videoId: targetVideoId, userId: targetUserId, desiredState },
      transaction,
    ) => {
      transaction.update<boolean>(
        bookmarkQueryKeys.video(targetVideoId, targetUserId),
        () => desiredState,
      );
      if (!desiredState) {
        transaction.update<InfiniteData<BookmarkPage, number>>(
          bookmarkQueryKeys.list(targetUserId),
          (current) =>
            removeBookmarkedVideo(current, targetVideoId) ?? {
              pages: [],
              pageParams: [],
            },
        );
      }
    },
    onSuccess: (bookmarked, variables) => {
      queryClient.setQueryData(
        bookmarkQueryKeys.video(variables.videoId, variables.userId),
        bookmarked,
      );
    },
    invalidate: (_data, _error, variables) => [
      {
        queryKey: bookmarkQueryKeys.video(variables.videoId, variables.userId),
      },
      { queryKey: bookmarkQueryKeys.list(variables.userId) },
      { queryKey: feedQueryKeys.all },
    ],
    retry: false,
  });
  const { mutateAsync } = mutation;

  useBookmarkRealtime(userId, videoId);

  const toggle = useCallback(async (): Promise<boolean> => {
    if (!userId || !isAuthenticated) {
      throw new BookmarkServiceError(
        'unauthorized',
        'Sign in to save videos to your bookmarks.',
      );
    }
    if (!isValidVideoId || !dataUpdatedAt || queryIsError) {
      throw new BookmarkServiceError(
        'video_unavailable',
        'The bookmark state is not ready. Refresh and try again.',
      );
    }

    return mutateAsync({
      videoId,
      userId,
      desiredState: !currentBookmarkState,
    });
  }, [
    currentBookmarkState,
    dataUpdatedAt,
    isAuthenticated,
    isValidVideoId,
    mutateAsync,
    queryIsError,
    userId,
    videoId,
  ]);
  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    bookmarked: currentBookmarkState ?? false,
    error: mutation.error ?? queryError,
    isError: queryIsError,
    isLoading: isAuthLoading || (!dataUpdatedAt && isFetching),
    isPending: mutation.isPending,
    isReady: Boolean(dataUpdatedAt) && !queryIsError,
    isAuthenticated,
    retry,
    toggle,
  };
}
