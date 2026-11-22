import type { VideoPlayerState } from '../types/player';

export const initialVideoPlayerState: VideoPlayerState = {
  status: 'idle',
  currentTime: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: true,
  ready: false,
  fullscreen: false,
  error: null,
};

export const videoVisibilityOptions = {
  threshold: 0.45,
  rootMargin: '0px',
} as const;

export const videoProgressUpdateInterval = 200;
