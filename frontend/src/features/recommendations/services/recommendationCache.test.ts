import { describe, expect, it } from 'vitest';
import { scoreCacheTtlMs } from '../constants';
import { RecommendationCache } from './recommendationCache';

describe('RecommendationCache', () => {
  it('expires score entries and clears user-specific cache entries', () => {
    const cache = new RecommendationCache();
    const now = 1_000;

    cache.setScore('user-id', 'video-id', 72, now);
    expect(cache.getScore('user-id', 'video-id', now + 1)).toBe(72);
    expect(
      cache.getScore('user-id', 'video-id', now + scoreCacheTtlMs),
    ).toBeNull();

    cache.setScore('user-id', 'another-video', 55, now);
    cache.invalidateUser('user-id');
    expect(cache.getScore('user-id', 'another-video', now + 1)).toBeNull();
  });
});
