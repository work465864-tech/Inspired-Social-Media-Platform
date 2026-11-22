import { describe, expect, it } from 'vitest';
import type { Video } from '../types';
import { FeedCache } from './feedCache';

const video: Video = {
  id: 'cached-video',
  title: 'Cached video',
  description: '',
  thumbnail: null,
  playbackUrl: 'https://cdn.example/cached-video.mp4',
  duration: 10,
  width: 720,
  height: 1280,
  views: 0,
  likes: 0,
  comments: 0,
  shares: 0,
  creator: { id: null, name: 'Creator', avatarUrl: null },
  createdAt: null,
  isDemoContent: true,
  attribution: {
    label: 'Pixabay',
    url: 'https://pixabay.com/videos/',
  },
};

describe('FeedCache', () => {
  it('expires stale sessions and keeps recently used sessions', () => {
    let now = 100;
    const cache = new FeedCache(50, 2, () => now);
    const entry = {
      databaseVideos: [video],
      items: [video],
      nextFallbackPage: null,
      fallbackExhausted: true,
      createdAt: now,
    };

    cache.set('user-1', entry);
    expect(cache.get('user-1')).toBe(entry);

    now = 151;
    expect(cache.get('user-1')).toBeNull();
  });

  it('evicts the least recently used session at capacity', () => {
    const cache = new FeedCache(1_000, 2, () => 100);
    const entry = {
      databaseVideos: [video],
      items: [video],
      nextFallbackPage: null,
      fallbackExhausted: true,
      createdAt: 100,
    };

    cache.set('user-1', entry);
    cache.set('user-2', entry);
    cache.get('user-1');
    cache.set('user-3', entry);

    expect(cache.get('user-1')).toBe(entry);
    expect(cache.get('user-2')).toBeNull();
    expect(cache.get('user-3')).toBe(entry);
  });
});
