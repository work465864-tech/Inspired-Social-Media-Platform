'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { useOptimisticMutation } from '../../mutations/hooks/useOptimisticMutation';
import { notificationQueryKeys } from '../constants/queryKeys';
import { notificationPreferenceService } from '../services/notificationPreferenceService';
import { NotificationServiceError } from '../services/notificationService';
import type { NotificationPreferences } from '../types';

const defaultPreferences: NotificationPreferences = {
  likes: true,
  comments: true,
  follows: true,
  push: true,
  email: true,
};

export function useNotificationSettings() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const queryKey = notificationQueryKeys.settings(userId);
  const query = useQuery({
    queryKey,
    queryFn: () =>
      userId
        ? notificationPreferenceService.get(userId)
        : Promise.reject(
            new NotificationServiceError(
              'unauthorized',
              'Sign in to update notification preferences.',
            ),
          ),
    initialData: defaultPreferences,
    initialDataUpdatedAt: 0,
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 60_000,
    retry: 1,
  });

  const mutation = useOptimisticMutation<
    NotificationPreferences,
    NotificationServiceError,
    NotificationPreferences
  >({
    mutationKey: ['notifications', 'settings'],
    mutationFn: (preferences) => {
      if (!userId) {
        return Promise.reject(
          new NotificationServiceError(
            'unauthorized',
            'Sign in to update notification preferences.',
          ),
        );
      }
      return notificationPreferenceService.update(userId, preferences);
    },
    optimisticUpdate: (preferences, transaction) => {
      transaction.update<NotificationPreferences>(queryKey, () => preferences);
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKey, preferences);
    },
    invalidate: () => [{ queryKey }],
    retry: false,
  });
  const { mutateAsync } = mutation;

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      if (!userId || !isAuthenticated) {
        throw new NotificationServiceError(
          'unauthorized',
          'Sign in to update notification preferences.',
        );
      }
      await mutateAsync({ ...query.data, [key]: value });
    },
    [isAuthenticated, mutateAsync, query.data, userId],
  );

  return {
    preferences: query.data ?? defaultPreferences,
    error: mutation.error ?? query.error,
    isLoading: isAuthLoading || (!query.dataUpdatedAt && query.isFetching),
    isPending: mutation.isPending,
    updatePreference,
  };
}
