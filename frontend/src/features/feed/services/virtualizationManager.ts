import type { FeedPost } from '../types/feed';

export const feedVirtualizationConfig = {
  gap: 24,
  overscan: 2,
  preloadNeighbors: 1,
  scrollPaddingStart: 128,
} as const;

export function estimateFeedItemSize(viewportHeight: number): number {
  return Math.max(480, Math.round(viewportHeight * 0.78));
}

export function getPreloadWindow(
  posts: FeedPost[],
  activeIndex: number,
): string[] {
  if (activeIndex < 0) {
    return [];
  }

  const start = Math.max(
    0,
    activeIndex - feedVirtualizationConfig.preloadNeighbors,
  );
  const end = Math.min(
    posts.length,
    activeIndex + feedVirtualizationConfig.preloadNeighbors + 1,
  );

  return posts.slice(start, end).map((post) => post.id);
}
