'use client';

import { useCallback } from 'react';
import { useSubscription } from '../../realtime/hooks/useSubscription';
import type { RealtimeChannelSetup } from '../../realtime/types/subscription';
import { commentRealtimeService } from '../services/commentRealtimeService';

export function useCommentRealtime(videoId: string, enabled: boolean): void {
  const setup = useCallback<RealtimeChannelSetup>(
    (channel, events) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          commentRealtimeService.dispatchCommentChange(
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
          table: 'comments',
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          commentRealtimeService.dispatchCommentChange(
            events,
            'UPDATE',
            payload.new,
          );
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
          commentRealtimeService.dispatchVideoCount(events, payload.new);
        },
      );
    },
    [videoId],
  );

  useSubscription(`comments:${videoId}`, `comments:${videoId}`, setup, enabled);
}
