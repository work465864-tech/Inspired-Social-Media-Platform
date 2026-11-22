'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { notificationQueryKeys } from '../constants/queryKeys';
import { notificationService } from '../services/notificationService';

export function useUnreadCount() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: notificationQueryKeys.unreadCount(userId),
    queryFn: ({ signal }) =>
      userId
        ? notificationService.getUnreadCount(userId, signal)
        : Promise.resolve(0),
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 15_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  return {
    ...query,
    count: query.data ?? 0,
  };
}
