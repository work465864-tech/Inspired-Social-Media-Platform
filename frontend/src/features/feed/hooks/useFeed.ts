'use client';

import { useCallback, useMemo } from 'react';
import { useFeedPagination } from './useFeedPagination';
import type { UseFeedPaginationOptions } from './useFeedPagination';
import { useRefreshFeed } from './useRefreshFeed';

export function useFeed(options?: UseFeedPaginationOptions) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    isRefetching,
  } = useFeedPagination(options);
  const feedKey = options?.feedKey ?? 'for-you';
  const pageSize = options?.pageSize ?? 12;
  const refresh = useRefreshFeed({ feedKey, pageSize });

  const posts = useMemo(
    () =>
      data?.pages.flatMap((page) => page.items.map((item) => item.post)) ?? [],
    [data],
  );

  const loadUntilHeight = useCallback(
    async (scrollY: number, signal: AbortSignal) => {
      const targetHeight = scrollY + window.innerHeight;
      let canLoadMore = hasNextPage;

      while (
        !signal.aborted &&
        document.documentElement.scrollHeight < targetHeight &&
        canLoadMore
      ) {
        const result = await fetchNextPage({ cancelRefetch: false });
        canLoadMore = result.hasNextPage;
        if (!canLoadMore || result.isFetchNextPageError) {
          break;
        }

        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
      }
    },
    [fetchNextPage, hasNextPage],
  );

  return {
    error,
    fetchNextPage,
    hasNextPage,
    isEmpty: !isLoading && posts.length === 0,
    isError,
    isFetchingNextPage,
    isLoading,
    isRefreshing: isRefetching && !isLoading,
    loadUntilHeight,
    posts,
    refresh,
    totalCount: data?.pages[0]?.totalCount ?? 0,
  };
}
