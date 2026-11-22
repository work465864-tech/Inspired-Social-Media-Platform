'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { feedQueryKeys } from '../constants/queryKeys';
import type { UseFeedPaginationOptions } from './useFeedPagination';

export function useRefreshFeed({
  feedKey = 'for-you',
  pageSize = 12,
}: UseFeedPaginationOptions = {}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => feedQueryKeys.infinite(feedKey, pageSize),
    [feedKey, pageSize],
  );

  return useCallback(
    () => queryClient.resetQueries({ queryKey, exact: true }),
    [queryClient, queryKey],
  );
}
