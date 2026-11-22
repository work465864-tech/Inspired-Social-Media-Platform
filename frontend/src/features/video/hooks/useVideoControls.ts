'use client';

import { useCallback } from 'react';
import type { RefObject } from 'react';
import { getPlaybackErrorMessage } from '../services/videoPlayback';

type UseVideoControlsOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLElement | null>;
  setPlaybackError: (message: string) => void;
  clearPlaybackError: () => void;
};

export type VideoControlsApi = {
  play: () => Promise<void>;
  pause: () => void;
  togglePlayback: () => Promise<void>;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  replay: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  retry: () => Promise<void>;
};

export function useVideoControls({
  clearPlaybackError,
  containerRef,
  setPlaybackError,
  videoRef,
}: UseVideoControlsOptions): VideoControlsApi {
  const play = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      clearPlaybackError();
      await video.play();
    } catch (error) {
      setPlaybackError(getPlaybackErrorMessage(error));
    }
  }, [clearPlaybackError, setPlaybackError, videoRef]);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, [videoRef]);

  const togglePlayback = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused || video.ended) {
      await play();
    } else {
      pause();
    }
  }, [pause, play, videoRef]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(time)) {
        return;
      }

      const upperBound = Number.isFinite(video.duration) ? video.duration : 0;
      video.currentTime = Math.min(Math.max(time, 0), upperBound);
    },
    [videoRef],
  );

  const setVolume = useCallback(
    (volume: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(volume)) {
        return;
      }

      video.volume = Math.min(Math.max(volume, 0), 1);
      video.muted = video.volume === 0;
      clearPlaybackError();
    },
    [clearPlaybackError, videoRef],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) {
      video.volume = 0.5;
    }
  }, [videoRef]);

  const replay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    try {
      video.currentTime = 0;
      await play();
    } catch (error) {
      setPlaybackError(getPlaybackErrorMessage(error));
    }
  }, [play, setPlaybackError, videoRef]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else {
        throw new Error('Fullscreen is not supported by this browser.');
      }
    } catch (error) {
      setPlaybackError(getPlaybackErrorMessage(error));
    }
  }, [containerRef, setPlaybackError]);

  const retry = useCallback(async () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    clearPlaybackError();
    video.load();
    await play();
  }, [clearPlaybackError, play, videoRef]);

  return {
    play,
    pause,
    togglePlayback,
    seekTo,
    setVolume,
    toggleMute,
    replay,
    toggleFullscreen,
    retry,
  };
}
