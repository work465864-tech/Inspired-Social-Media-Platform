'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeEvent } from '../../realtime/hooks/useRealtimeEvent';
import { useSubscription } from '../../realtime/hooks/useSubscription';
import type { RealtimeChannelSetup } from '../../realtime/types/subscription';
import { bookmarkQueryKeys } from '../constants/queryKeys';
import { bookmarkRealtimeService } from '../services/bookmarkRealtimeService';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useBookmarkRealtime(
  userId: string | null,
  videoId?: string,
): void {
  const queryClient = useQueryClient();
  const enabled = userId !== null && uuidPattern.test(userId);
  const setup = useCallback<RealtimeChannelSetup>(
    (channel, events) => {
      if (!userId) {
        return;
      }

      for (const eventType of ['INSERT', 'DELETE'] as const) {
        channel.on(
          'postgres_changes',
          {
            event: eventType,
            schema: 'public',
            table: 'bookmarks',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = eventType === 'INSERT' ? payload.new : payload.old;
            bookmarkRealtimeService.dispatchBookmarkChange(
              events,
              eventType,
              row,
            );
          },
        );
      }
    },
    [userId],
  );

  const handleBookmarkCreated = useCallback(
    (event: { payload: { videoId: string; userId: string } }) => {
      if (event.payload.userId !== userId) {
        return;
      }
      if (videoId && event.payload.videoId === videoId) {
        queryClient.setQueryData(
          bookmarkQueryKeys.video(videoId, userId),
          true,
        );
      }
    },
    [queryClient, userId, videoId],
  );
  const handleBookmarkRemoved = useCallback(
    (event: { payload: { videoId: string; userId: string } }) => {
      if (event.payload.userId !== userId) {
        return;
      }
      if (videoId && event.payload.videoId === videoId) {
        queryClient.setQueryData(
          bookmarkQueryKeys.video(videoId, userId),
          false,
        );
      }
    },
    [queryClient, userId, videoId],
  );

  useSubscription(
    `bookmarks:${userId ?? 'anonymous'}`,
    `bookmarks:${userId ?? 'anonymous'}`,
    setup,
    enabled,
  );
  useRealtimeEvent('BOOKMARK_CREATED', handleBookmarkCreated);
  useRealtimeEvent('BOOKMARK_REMOVED', handleBookmarkRemoved);
}
