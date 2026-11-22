'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { notificationQueryKeys } from '../constants/queryKeys';
import {
  NotificationServiceError,
  notificationService,
} from '../services/notificationService';
import {
  updateCachedNotification,
  updateCachedNotifications,
  type NotificationPages,
} from '../services/notificationCache';

type SetReadVariables = {
  notificationId: string;
  readAt: string | null;
};

type MarkAllVariables = {
  readAt: string;
};

export function useMarkAsRead() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const setMutation = useOptimisticMutation<
    string | null,
    NotificationServiceError,
    SetReadVariables
  >({
    mutationKey: ['notifications', 'set-read'],
    mutationFn: ({ notificationId, readAt }) =>
      userId
        ? notificationService.setReadState(userId, notificationId, readAt)
        : Promise.reject(
            new NotificationServiceError(
              'unauthorized',
              'Sign in to update notifications.',
            ),
          ),
    optimisticUpdate: (variables, transaction) => {
      if (!userId) {
        return;
      }

      const listQueries = queryClient.getQueriesData<NotificationPages>({
        queryKey: notificationQueryKeys.lists(userId),
      });
      let existingReadAt: string | null | undefined;
      for (const [queryKey, pages] of listQueries) {
        const notification = pages?.pages
          .flatMap((page) => page.items)
          .find((item) => item.id === variables.notificationId);
        if (notification) {
          existingReadAt = notification.readAt;
        }
        transaction.update<NotificationPages>(
          queryKey,
          (current) =>
            updateCachedNotification(
              current,
              variables.notificationId,
              (item) => ({
                ...item,
                readAt: variables.readAt,
              }),
            ) ?? { pages: [], pageParams: [] },
        );
      }

      if (
        existingReadAt !== undefined &&
        (existingReadAt === null) !== (variables.readAt === null)
      ) {
        transaction.update<number>(
          notificationQueryKeys.unreadCount(userId),
          (count) =>
            Math.max(0, (count ?? 0) + (variables.readAt === null ? 1 : -1)),
        );
      }
    },
    onSuccess: (readAt, variables) => {
      if (!userId) {
        return;
      }
      const listQueries = queryClient.getQueriesData<NotificationPages>({
        queryKey: notificationQueryKeys.lists(userId),
      });
      for (const [queryKey] of listQueries) {
        queryClient.setQueryData<NotificationPages>(queryKey, (current) =>
          updateCachedNotification(
            current,
            variables.notificationId,
            (item) => ({
              ...item,
              readAt,
            }),
          ),
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

  const allMutation = useOptimisticMutation<
    string,
    NotificationServiceError,
    MarkAllVariables
  >({
    mutationKey: ['notifications', 'mark-all-read'],
    mutationFn: ({ readAt }) =>
      userId
        ? notificationService.markAllAsRead(userId, readAt)
        : Promise.reject(
            new NotificationServiceError(
              'unauthorized',
              'Sign in to update notifications.',
            ),
          ),
    optimisticUpdate: (variables, transaction) => {
      if (!userId) {
        return;
      }
      const listQueries = queryClient.getQueriesData<NotificationPages>({
        queryKey: notificationQueryKeys.lists(userId),
      });
      for (const [queryKey] of listQueries) {
        transaction.update<NotificationPages>(
          queryKey,
          (current) =>
            updateCachedNotifications(current, (item) =>
              item.readAt === null
                ? { ...item, readAt: variables.readAt }
                : item,
            ) ?? { pages: [], pageParams: [] },
        );
      }
      transaction.update<number>(
        notificationQueryKeys.unreadCount(userId),
        () => 0,
      );
    },
    onSuccess: (readAt) => {
      if (!userId) {
        return;
      }
      const listQueries = queryClient.getQueriesData<NotificationPages>({
        queryKey: notificationQueryKeys.lists(userId),
      });
      for (const [queryKey] of listQueries) {
        queryClient.setQueryData<NotificationPages>(queryKey, (current) =>
          updateCachedNotifications(current, (item) =>
            item.readAt === null ? { ...item, readAt } : item,
          ),
        );
      }
      queryClient.setQueryData(notificationQueryKeys.unreadCount(userId), 0);
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
  const { mutateAsync: setReadAsync } = setMutation;
  const { mutateAsync: markAllAsync } = allMutation;

  const setRead = useCallback(
    async (notificationId: string, isRead: boolean) => {
      if (!userId || !isAuthenticated) {
        throw new NotificationServiceError(
          'unauthorized',
          'Sign in to update notifications.',
        );
      }
      await setReadAsync({
        notificationId,
        readAt: isRead ? new Date().toISOString() : null,
      });
    },
    [isAuthenticated, setReadAsync, userId],
  );
  const markAllRead = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      throw new NotificationServiceError(
        'unauthorized',
        'Sign in to update notifications.',
      );
    }
    await markAllAsync({ readAt: new Date().toISOString() });
  }, [isAuthenticated, markAllAsync, userId]);

  return {
    error: setMutation.error ?? allMutation.error,
    isPending: setMutation.isPending || allMutation.isPending,
    markAllRead,
    setRead,
  };
}
