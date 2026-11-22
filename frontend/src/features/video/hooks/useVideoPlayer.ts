'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useVideoControls } from './useVideoControls';
import { useVideoState } from './useVideoState';
import { useVideoVisibility } from './useVideoVisibility';

type UseVideoPlayerOptions = {
  autoPlay: boolean;
  autoPauseWhenOffscreen: boolean;
  isActive?: boolean;
  preloadNext?: boolean;
  src: string;
};

export function useVideoPlayer({
  autoPauseWhenOffscreen,
  autoPlay,
  isActive,
  preloadNext = false,
  src,
}: UseVideoPlayerOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isVisible, visibilityRef } = useVideoVisibility({
    enabled: autoPauseWhenOffscreen,
  });
  const { clearPlaybackError, setPlaybackError, state } = useVideoState(
    videoRef,
    containerRef,
  );
  const controls = useVideoControls({
    clearPlaybackError,
    containerRef,
    setPlaybackError,
    videoRef,
  });
  const { play } = controls;

  const setContainerRef = useCallback(
    (element: HTMLDivElement | null) => {
      containerRef.current = element;
      visibilityRef(element);
    },
    [visibilityRef],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!isVisible || isActive === false) {
      video.pause();
      return;
    }

    if (autoPlay || isActive === true) {
      void play();
    }
  }, [autoPlay, isActive, isVisible, play, src]);

  useEffect(
    () => () => {
      videoRef.current?.pause();
    },
    [],
  );

  return {
    containerRef: setContainerRef,
    controls,
    shouldLoad:
      isVisible || isActive === true || preloadNext || !autoPauseWhenOffscreen,
    state,
    videoRef,
  };
}
