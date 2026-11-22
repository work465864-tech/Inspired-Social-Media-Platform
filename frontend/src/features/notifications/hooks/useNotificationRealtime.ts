'use client';

import { useCallback } from 'react';
import { useSubscription } from '../../realtime/hooks/useSubscription';
import type { RealtimeChannelSetup } from '../../realtime/types/subscription';
import { notificationRealtimeService } from '../services/notificationRealtimeService';

export function useNotificationRealtime(userId: string | null): void {
  const setup = useCallback<RealtimeChannelSetup>(
    (channel, events) => {
      if (!userId) {
        return;
      }
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          notificationRealtimeService.dispatchChange(
            events,
            'INSERT',
            payload.new,
          );
        },
      );
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          notificationRealtimeService.dispatchChange(
            events,
            'UPDATE',
            payload.new,
          );
        },
      );
    },
    [userId],
  );

  useSubscription(
    userId ? `notifications:${userId}` : 'notifications:disabled',
    userId ? `notifications:${userId}` : 'notifications:disabled',
    setup,
    userId !== null,
  );
}
