import { describe, expect, it } from 'vitest';
import type { Video } from '../../feed/types/models';
import { FeedPriorityEngine } from './feedPriorityEngine';

function makeDatabaseVideo(id: string): Video {
  return {
    id,
    userId: 'creator',
    caption: `Video ${id}`,
    visibility: 'public',
    status: 'ready',
    durationMs: 1_000,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    music: null,
    profile: {
      id: 'creator',
      username: 'creator',
      displayName: 'Creator',
      avatarUrl: null,
      isVerified: false,
      isPrivate: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    assets: [],
    stats: {
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: null,
      bookmarksCount: null,
    },
  };
}

describe('FeedPriorityEngine', () => {
  it('keeps source priority and removes duplicates without reordering sources', () => {
    const engine = new FeedPriorityEngine();
    const videos = engine.order({
      uploads: [makeDatabaseVideo('upload'), makeDatabaseVideo('shared')],
      trending: [makeDatabaseVideo('trending'), makeDatabaseVideo('shared')],
      following: [makeDatabaseVideo('following')],
      recommended: [makeDatabaseVideo('recommended')],
    });

    expect(videos.map((video) => video.id)).toEqual([
      'upload',
      'shared',
      'trending',
      'following',
      'recommended',
    ]);
  });
});
