import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Video } from '../../feed/types/models';
import { recommendationCache } from './recommendationCache';

const { generateMock } = vi.hoisted(() => ({
  generateMock: vi.fn(),
}));

vi.mock('./recommendationEngine', () => ({
  recommendationEngine: { generate: generateMock },
}));

import {
  RecommendationPageExpiredError,
  RecommendationService,
} from './recommendationService';
import type { RecommendationItem } from '../types';

const userId = 'c0d3a43a-b378-4b89-9a7f-4d54d05a7c12';

function createItem(id: string): RecommendationItem {
  const video: Video = {
    id,
    userId,
    caption: 'For You test video',
    visibility: 'public',
    status: 'ready',
    durationMs: 1_000,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
    music: null,
    profile: {
      id: userId,
      username: 'creator',
      displayName: 'Creator',
      avatarUrl: null,
      isVerified: false,
      isPrivate: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    assets: [],
    stats: {
      viewsCount: 20,
      likesCount: 3,
      commentsCount: 1,
      sharesCount: null,
      bookmarksCount: null,
    },
  };

  return {
    video,
    score: 75,
    rawScore: 70,
    signals: {
      watchTime: null,
      completionRate: null,
      likes: 0.5,
      comments: 0.2,
      shares: null,
      bookmarks: null,
      followStatus: 0,
      freshness: 0.9,
      trending: 0.8,
      creatorDiversity: 1,
      categoryDiversity: null,
      videoQuality: null,
      categoryAffinity: null,
    },
    sources: ['fresh'],
    categories: [],
  };
}

describe('RecommendationService', () => {
  beforeEach(() => {
    recommendationCache.clear();
    generateMock.mockReset();
    generateMock.mockResolvedValue([
      createItem('d0d3a43a-b378-4b89-9a7f-4d54d05a7c12'),
      createItem('e0d3a43a-b378-4b89-9a7f-4d54d05a7c12'),
    ]);
  });

  it('paginates a stable cached ranking session without regenerating candidates', async () => {
    const service = new RecommendationService();
    const signal = new AbortController().signal;
    const firstPage = await service.getPage(userId, null, signal, 1);
    const cursor = firstPage.nextCursor;

    expect(firstPage.items).toHaveLength(1);
    expect(cursor).not.toBeNull();
    if (!cursor) {
      throw new Error('The first recommendation page should have a cursor.');
    }
    const secondPage = await service.getPage(userId, cursor, signal, 1);

    expect(secondPage.items[0].video.id).toBe(
      'e0d3a43a-b378-4b89-9a7f-4d54d05a7c12',
    );
    expect(secondPage.nextCursor).toBeNull();
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it('rejects expired recommendation cursors explicitly', async () => {
    const service = new RecommendationService();

    await expect(
      service.getPage(
        userId,
        {
          sessionId: 'f0d3a43a-b378-4b89-9a7f-4d54d05a7c12',
          offset: 1,
          pageSize: 1,
        },
        new AbortController().signal,
        1,
      ),
    ).rejects.toBeInstanceOf(RecommendationPageExpiredError);
  });
});
