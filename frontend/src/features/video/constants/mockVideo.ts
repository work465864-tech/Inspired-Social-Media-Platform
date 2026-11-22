import type { VideoPlayerProps } from '../types/player';

export const localMockVideo = {
  src: '/mock-videos/connectly-preview.webm',
  title: 'Connectly motion preview',
  autoPlay: false,
  autoPauseWhenOffscreen: true,
  loop: true,
  muted: true,
} satisfies Pick<
  VideoPlayerProps,
  'src' | 'title' | 'autoPlay' | 'autoPauseWhenOffscreen' | 'loop' | 'muted'
>;
