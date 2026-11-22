'use client';

import { useCallback, useRef } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import type { VideoPlayerState } from '../../video/types/player';
import { trackCreatorAnalyticsEvent } from '../services/analyticsEventQueue';

type PlaybackSample = {
  status: VideoPlayerState['status'];
  currentTime: number;
  duration: number;
};

type PlaybackSession = {
  id: string;
  finished: boolean;
  previousTime: number | null;
  previousWallTime: number | null;
  maxPositionMs: number;
  durationMs: number;
  pendingWatchMs: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createPlaybackId(): string {
  return crypto.randomUUID();
}

function newPlaybackSession(): PlaybackSession {
  return {
    id: createPlaybackId(),
    finished: false,
    previousTime: null,
    previousWallTime: null,
    maxPositionMs: 0,
    durationMs: 0,
    pendingWatchMs: 0,
  };
}

export function useVideoAnalyticsTracking({
  creatorId,
  isDemoContent,
  videoId,
}: {
  creatorId: string | null;
  isDemoContent: boolean;
  videoId: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const enabled =
    isAuthenticated &&
    !isLoading &&
    !isDemoContent &&
    creatorId !== null &&
    uuidPattern.test(creatorId) &&
    uuidPattern.test(videoId);
  const impressionSentRef = useRef(false);
  const playbackRef = useRef<PlaybackSession | null>(null);

  const sendWatchSample = useCallback(
    (session: PlaybackSession) => {
      if (!enabled || !session.id || session.pendingWatchMs <= 0) {
        return;
      }

      const watchMs = Math.min(60_000, Math.round(session.pendingWatchMs));
      session.pendingWatchMs = 0;
      trackCreatorAnalyticsEvent({
        eventType: 'video_watch',
        videoId,
        playbackId: session.id,
        watchMs,
        positionMs: session.maxPositionMs,
        durationMs: session.durationMs || undefined,
      });
    },
    [enabled, videoId],
  );

  const finishPlayback = useCallback(
    (session: PlaybackSession, positionMs: number, durationMs: number) => {
      if (!enabled || !session.id || session.finished) {
        return;
      }

      sendWatchSample(session);
      session.finished = true;
      session.previousWallTime = null;
      trackCreatorAnalyticsEvent({
        eventType: 'video_finish',
        videoId,
        playbackId: session.id,
        positionMs: Math.max(session.maxPositionMs, positionMs),
        durationMs: durationMs || session.durationMs || undefined,
      });
    },
    [enabled, sendWatchSample, videoId],
  );

  const beginPlayback = useCallback(
    (currentTime: number, duration: number): PlaybackSession => {
      const session = newPlaybackSession();
      session.previousTime = currentTime;
      session.previousWallTime = Date.now();
      session.maxPositionMs = Math.max(0, Math.round(currentTime * 1000));
      session.durationMs = Math.max(0, Math.round(duration * 1000));
      playbackRef.current = session;
      if (enabled) {
        trackCreatorAnalyticsEvent({
          eventType: 'video_start',
          videoId,
          playbackId: session.id,
          positionMs: session.maxPositionMs,
          durationMs: session.durationMs || undefined,
        });
      }
      return session;
    },
    [enabled, videoId],
  );

  const handlePlaybackSample = useCallback(
    ({ currentTime, duration, status }: PlaybackSample) => {
      if (!enabled) {
        return;
      }

      const now = Date.now();
      let session = playbackRef.current;
      const timeMovedBack =
        session?.previousTime !== null &&
        session?.previousTime !== undefined &&
        currentTime + 1 < session.previousTime;

      if (!session && status !== 'playing') {
        return;
      }
      if (session?.finished && timeMovedBack && status !== 'playing') {
        session.previousTime = currentTime;
        return;
      }
      if (!session || (session.finished && timeMovedBack)) {
        session = beginPlayback(currentTime, duration);
      }

      const positionMs = Math.max(0, Math.round(currentTime * 1000));
      const durationMs = Math.max(0, Math.round(duration * 1000));
      session.maxPositionMs = Math.max(session.maxPositionMs, positionMs);
      session.durationMs = durationMs || session.durationMs;

      if (status === 'ended') {
        finishPlayback(session, positionMs, durationMs);
      } else if (status === 'playing') {
        if (
          session.previousWallTime !== null &&
          session.previousTime !== null
        ) {
          const wallDelta = now - session.previousWallTime;
          const mediaDelta = currentTime - session.previousTime;
          if (wallDelta > 0 && wallDelta <= 1500 && mediaDelta > 0) {
            session.pendingWatchMs += wallDelta;
          }
        }
        session.previousWallTime = now;
        if (session.pendingWatchMs >= 10_000) {
          sendWatchSample(session);
        }
        if (
          duration > 0 &&
          currentTime >= duration - Math.max(0.5, duration * 0.015)
        ) {
          finishPlayback(session, positionMs, durationMs);
        }
      } else {
        session.previousWallTime = null;
      }

      session.previousTime = currentTime;
    },
    [beginPlayback, enabled, finishPlayback, sendWatchSample],
  );

  const trackImpression = useCallback(() => {
    if (!enabled || impressionSentRef.current) {
      return;
    }

    impressionSentRef.current = true;
    trackCreatorAnalyticsEvent({
      eventType: 'video_impression',
      videoId,
    });
  }, [enabled, videoId]);

  const onPlaybackStateChange = useCallback(
    (state: VideoPlayerState) => {
      handlePlaybackSample(state);
    },
    [handlePlaybackSample],
  );

  const trackMediaElement = useCallback(
    (element: HTMLVideoElement | null) => {
      if (!element) {
        return;
      }
      handlePlaybackSample({
        currentTime: element.currentTime,
        duration: element.duration,
        status: element.ended ? 'ended' : element.paused ? 'paused' : 'playing',
      });
    },
    [handlePlaybackSample],
  );

  const trackShare = useCallback(
    (shareMethod: 'native' | 'copy' | 'external' = 'native') => {
      if (!enabled) {
        return;
      }
      trackCreatorAnalyticsEvent({
        eventType: 'video_share',
        videoId,
        metadata: { shareMethod },
      });
    },
    [enabled, videoId],
  );

  return {
    onPlaybackStateChange,
    trackImpression,
    trackMediaElement,
    trackShare,
  };
}
