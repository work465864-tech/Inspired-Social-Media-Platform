import type { ReactNode } from 'react';

export type VideoPlayerStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'error';

export type VideoPlayerState = {
  status: VideoPlayerStatus;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  ready: boolean;
  fullscreen: boolean;
  error: string | null;
};

export type VideoSource = {
  src: string;
  type?: string;
};

export type VideoPlayerProps = {
  src: string;
  title: string;
  poster?: string;
  autoPlay?: boolean;
  autoPauseWhenOffscreen?: boolean;
  isActive?: boolean;
  preloadNext?: boolean;
  loop?: boolean;
  muted?: boolean;
  fit?: 'contain' | 'cover';
  showReplayButton?: boolean;
  onSurfaceTap?: () => void;
  onDoubleTap?: () => void;
  overlay?: ReactNode;
  className?: string;
  onPlaybackStateChange?: (state: VideoPlayerState) => void;
};
