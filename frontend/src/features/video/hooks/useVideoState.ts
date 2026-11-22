'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
  initialVideoPlayerState,
  videoProgressUpdateInterval,
} from '../constants/player';
import { getMediaErrorMessage } from '../services/videoPlayback';
import type { VideoPlayerState, VideoPlayerStatus } from '../types/player';

type UseVideoStateResult = {
  state: VideoPlayerState;
  setPlaybackError: (message: string) => void;
  clearPlaybackError: () => void;
};

function getBufferedPercent(video: HTMLVideoElement): number {
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    return 0;
  }

  const lastRange = video.buffered.length - 1;
  if (lastRange < 0) {
    return 0;
  }

  return Math.min(100, (video.buffered.end(lastRange) / video.duration) * 100);
}

export function useVideoState(
  videoRef: RefObject<HTMLVideoElement | null>,
  containerRef: RefObject<HTMLElement | null>,
): UseVideoStateResult {
  const [state, setState] = useState(initialVideoPlayerState);
  const lastProgressUpdateRef = useRef(0);

  const setPlaybackError = useCallback((message: string) => {
    setState((current) => ({
      ...current,
      status: 'error',
      error: message,
    }));
  }, []);

  const clearPlaybackError = useCallback(() => {
    setState((current) => ({
      ...current,
      status: current.ready ? 'paused' : 'loading',
      error: null,
    }));
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const update = (status?: VideoPlayerStatus) => {
      setState((current) => ({
        ...current,
        status: status ?? current.status,
        currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        buffered: getBufferedPercent(video),
        volume: video.volume,
        muted: video.muted,
        ready: video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA,
        fullscreen: document.fullscreenElement === containerRef.current,
        error:
          status === 'error'
            ? getMediaErrorMessage(video.error)
            : current.error,
      }));
    };

    const onTimeUpdate = () => {
      const now = performance.now();
      if (now - lastProgressUpdateRef.current < videoProgressUpdateInterval) {
        return;
      }
      lastProgressUpdateRef.current = now;
      update();
    };

    const onLoadStart = () => update('loading');
    const onCanPlay = () => update(video.paused ? 'ready' : 'playing');
    const onPlay = () => update('playing');
    const onPause = () => {
      if (!video.ended) {
        update('paused');
      }
    };
    const onWaiting = () => update(video.paused ? 'paused' : 'buffering');
    const onEnded = () => update('ended');
    const onError = () => update('error');
    const onFullscreenChange = () => update();

    video.addEventListener('loadstart', onLoadStart);
    video.addEventListener('loadedmetadata', onTimeUpdate);
    video.addEventListener('loadeddata', onTimeUpdate);
    video.addEventListener('durationchange', onTimeUpdate);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onTimeUpdate);
    video.addEventListener('volumechange', onTimeUpdate);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    update(
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? 'ready' : 'idle',
    );

    return () => {
      video.removeEventListener('loadstart', onLoadStart);
      video.removeEventListener('loadedmetadata', onTimeUpdate);
      video.removeEventListener('loadeddata', onTimeUpdate);
      video.removeEventListener('durationchange', onTimeUpdate);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onTimeUpdate);
      video.removeEventListener('volumechange', onTimeUpdate);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [containerRef, videoRef]);

  return { state, setPlaybackError, clearPlaybackError };
}
