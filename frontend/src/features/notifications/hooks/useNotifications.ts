'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { notificationQueryKeys } from '../constants/queryKeys';
import { notificationService } from '../services/notificationService';
import type { NotificationFilter } from '../types';

export function useNotifications(filter: NotificationFilter = 'all') {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;

  const query = useInfiniteQuery({
    queryKey: notificationQueryKeys.list(userId, filter),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      userId
        ? notificationService.getPage(userId, filter, pageParam, signal)
        : Promise.resolve({ items: [], nextOffset: null }),
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    isAuthLoading,
    isAuthenticated,
  };
}
