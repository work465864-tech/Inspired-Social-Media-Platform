'use client';

import { useCallback } from 'react';
import { useSubscription } from '../../realtime/hooks/useSubscription';
import type { RealtimeChannelSetup } from '../../realtime/types/subscription';
import {
  mapRealtimeLikeChange,
  mapRealtimeVideoLikesCount,
} from '../services/realtimeLikeMapper';

export function useVideoLikeRealtime(videoId: string, enabled: boolean): void {
  const setup = useCallback<RealtimeChannelSetup>(
    (channel, events) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'likes',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          const change = mapRealtimeLikeChange('INSERT', payload.new);
          if (change) {
            events.dispatch(change.type, change.payload);
          }
        },
      );

      channel.on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'likes' },
        (payload) => {
          const change = mapRealtimeLikeChange('DELETE', payload.old);
          if (change?.payload.videoId === videoId) {
            events.dispatch(change.type, change.payload);
          }
        },
      );

      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${videoId}`,
        },
        (payload) => {
          const change = mapRealtimeVideoLikesCount(payload.new);
          if (change) {
            events.dispatch('VIDEO_UPDATED', {
              videoId: change.videoId,
              changes: { likes_count: change.count },
            });
          }
        },
      );
    },
    [videoId],
  );

  useSubscription(`likes:${videoId}`, `likes:${videoId}`, setup, enabled);
}
