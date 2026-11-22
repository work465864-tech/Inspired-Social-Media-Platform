'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { notificationQueryKeys } from '../constants/queryKeys';
import {
  removeCachedNotification,
  type NotificationPages,
} from '../services/notificationCache';
import {
  NotificationServiceError,
  notificationService,
} from '../services/notificationService';

type DeleteVariables = {
  notificationId: string;
};

export function useDeleteNotification() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const mutation = useOptimisticMutation<
    void,
    NotificationServiceError,
    DeleteVariables
  >({
    mutationKey: ['notifications', 'delete'],
    mutationFn: ({ notificationId }) =>
      userId
        ? notificationService.deleteOwnNotification(userId, notificationId)
        : Promise.reject(
            new NotificationServiceError(
              'unauthorized',
              'Sign in to delete notifications.',
            ),
          ),
    optimisticUpdate: (variables, transaction) => {
      if (!userId) {
        return;
      }
      const listQueries = queryClient.getQueriesData<NotificationPages>({
        queryKey: notificationQueryKeys.lists(userId),
      });
      let wasUnread = false;
      for (const [queryKey, pages] of listQueries) {
        const notification = pages?.pages
          .flatMap((page) => page.items)
          .find((item) => item.id === variables.notificationId);
        if (notification?.readAt === null) {
          wasUnread = true;
        }
        transaction.update<NotificationPages>(
          queryKey,
          (current) =>
            removeCachedNotification(current, variables.notificationId) ?? {
              pages: [],
              pageParams: [],
            },
        );
      }
      if (wasUnread) {
        transaction.update<number>(
          notificationQueryKeys.unreadCount(userId),
          (count) => Math.max(0, (count ?? 0) - 1),
        );
      }
    },
    invalidate: () =>
      userId
        ? [
            { queryKey: notificationQueryKeys.lists(userId) },
            { queryKey: notificationQueryKeys.unreadCount(userId) },
          ]
        : [],
    retry: false,
  });
  const { mutateAsync } = mutation;

  const remove = useCallback(
    async (notificationId: string) => {
      if (!userId || !isAuthenticated) {
        throw new NotificationServiceError(
          'unauthorized',
          'Sign in to delete notifications.',
        );
      }
      await mutateAsync({ notificationId });
    },
    [isAuthenticated, mutateAsync, userId],
  );

  return {
    error: mutation.error,
    isPending: mutation.isPending,
    remove,
  };
}
