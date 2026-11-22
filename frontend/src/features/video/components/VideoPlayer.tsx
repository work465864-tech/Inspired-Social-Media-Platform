'use client';

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { cn } from '../../../lib/utils';
import type { VideoPlayerProps } from '../types/player';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { VideoControls } from './VideoControls';
import {
  PlayPauseOverlay,
  VideoBuffering,
  VideoError,
  VideoLoading,
  VideoPoster,
} from './VideoPlayerStates';

const keyboardShortcuts =
  'Space: play or pause; K: play or pause; Left or Right Arrow: seek 5 seconds; Up or Down Arrow: adjust volume; M: mute; F: fullscreen.';

export const VideoPlayer = memo(function VideoPlayer({
  autoPauseWhenOffscreen = true,
  autoPlay = true,
  className,
  fit = 'contain',
  isActive,
  loop = true,
  muted = true,
  onDoubleTap,
  onPlaybackStateChange,
  onSurfaceTap,
  overlay,
  preloadNext = false,
  poster,
  showReplayButton = false,
  src,
  title,
}: VideoPlayerProps) {
  const player = useVideoPlayer({
    autoPauseWhenOffscreen,
    autoPlay,
    isActive,
    preloadNext,
    src,
  });
  const keyboardHelpId = useId();
  const [showPlaybackFeedback, setShowPlaybackFeedback] = useState(false);
  const feedbackTimerRef = useRef<number | null>(null);
  const clickTimerRef = useRef<number | null>(null);

  const showFeedback = useCallback(() => {
    setShowPlaybackFeedback(true);
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = window.setTimeout(
      () => setShowPlaybackFeedback(false),
      420,
    );
  }, []);

  const handleSurfaceClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('button, input, a, [role="slider"]')
      ) {
        return;
      }

      const handleSingleTap = () => {
        showFeedback();
        if (onSurfaceTap) {
          onSurfaceTap();
        } else {
          void player.controls.togglePlayback();
        }
      };

      if (!onDoubleTap) {
        handleSingleTap();
        return;
      }

      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        onDoubleTap();
        return;
      }

      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        handleSingleTap();
      }, 240);
    },
    [onDoubleTap, onSurfaceTap, player.controls, showFeedback],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('button, input, textarea, select, a'))
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case ' ':
        case 'k':
          event.preventDefault();
          showFeedback();
          void player.controls.togglePlayback();
          break;
        case 'arrowleft':
          event.preventDefault();
          player.controls.seekTo(player.state.currentTime - 5);
          break;
        case 'arrowright':
          event.preventDefault();
          player.controls.seekTo(player.state.currentTime + 5);
          break;
        case 'arrowup':
          event.preventDefault();
          player.controls.setVolume(player.state.volume + 0.1);
          break;
        case 'arrowdown':
          event.preventDefault();
          player.controls.setVolume(player.state.volume - 0.1);
          break;
        case 'm':
          player.controls.toggleMute();
          break;
        case 'f':
          void player.controls.toggleFullscreen();
          break;
      }
    },
    [
      player.controls,
      player.state.currentTime,
      player.state.volume,
      showFeedback,
    ],
  );

  useEffect(() => {
    onPlaybackStateChange?.(player.state);
  }, [onPlaybackStateChange, player.state]);

  useEffect(
    () => () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
      if (clickTimerRef.current !== null) {
        window.clearTimeout(clickTimerRef.current);
      }
    },
    [],
  );

  const isPlaying =
    player.state.status === 'playing' || player.state.status === 'buffering';

  return (
    <div
      aria-describedby={keyboardHelpId}
      aria-keyshortcuts="Space K ArrowLeft ArrowRight ArrowUp ArrowDown M F"
      aria-label={`Video player: ${title}`}
      className={cn(
        'relative isolate mx-auto aspect-[9/16] w-full max-w-[28rem] touch-manipulation overflow-hidden bg-black text-white shadow-2xl ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:rounded-2xl landscape:aspect-video landscape:max-w-5xl landscape:max-h-[80svh]',
        className,
      )}
      onClick={handleSurfaceClick}
      onKeyDown={handleKeyDown}
      ref={player.containerRef}
      role="group"
      tabIndex={0}
    >
      <video
        aria-label={title}
        className={cn(
          'absolute inset-0 z-0 h-full w-full',
          fit === 'cover' ? 'object-cover' : 'object-contain',
        )}
        loop={loop}
        muted={muted}
        playsInline
        preload={isActive ? 'auto' : preloadNext ? 'metadata' : 'none'}
        ref={player.videoRef}
        src={player.shouldLoad ? src : undefined}
      />

      <VideoPoster
        poster={poster}
        title={title}
        visible={!player.state.ready && player.state.status !== 'error'}
      />
      {overlay}
      <VideoLoading
        visible={player.state.status === 'loading' && !player.state.ready}
      />
      <VideoBuffering visible={player.state.status === 'buffering'} />
      <PlayPauseOverlay
        playing={isPlaying}
        visible={
          (player.state.status === 'idle' ||
            player.state.status === 'ready' ||
            player.state.status === 'paused' ||
            showPlaybackFeedback) &&
          player.state.status !== 'error'
        }
      />
      {player.state.error && (
        <VideoError
          message={player.state.error}
          onRetry={() => void player.controls.retry()}
        />
      )}

      <VideoControls
        controls={player.controls}
        showReplayButton={showReplayButton}
        state={player.state}
      />
      <p className="sr-only" id={keyboardHelpId}>
        {keyboardShortcuts}
      </p>
    </div>
  );
});
