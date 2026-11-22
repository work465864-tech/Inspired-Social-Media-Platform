'use client';

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { bookmarkQueryKeys } from '../constants/queryKeys';
import {
  BookmarkServiceError,
  bookmarkService,
} from '../services/bookmarkService';
import { useBookmarkRealtime } from './useBookmarkRealtime';

export function useBookmarks(enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id ?? null;

  const query = useInfiniteQuery({
    queryKey: bookmarkQueryKeys.list(userId),
    queryFn: ({ pageParam, signal }) =>
      userId
        ? bookmarkService.getPage(userId, pageParam, signal)
        : Promise.reject(
            new BookmarkServiceError(
              'unauthorized',
              'Sign in to view your bookmarks.',
            ),
          ),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: enabled && isAuthenticated && userId !== null,
    staleTime: 30_000,
    retry: 1,
  });

  useBookmarkRealtime(userId);
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    items,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
