import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock, getByIdsMock, hydrateThumbnailsMock } = vi.hoisted(
  () => ({
    createClientMock: vi.fn(),
    getByIdsMock: vi.fn(),
    hydrateThumbnailsMock: vi.fn(),
  }),
);

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: createClientMock,
}));

vi.mock('../../feed/services/videoService', () => ({
  videoService: { getByIds: getByIdsMock },
}));

vi.mock('../../feed/services/mediaService', () => ({
  mediaService: { hydrateThumbnails: hydrateThumbnailsMock },
}));

import type { Video } from '../../feed/types/models';
import { categoryService } from './categoryService';
import { ExploreService } from './exploreService';

type QueryResult = { data: unknown; error: unknown };
type QueryCall = { method: string; args: unknown[] };

class MockQueryBuilder {
  readonly calls: QueryCall[] = [];

  constructor(private readonly result: QueryResult) {}

  select(...args: unknown[]) {
    this.calls.push({ method: 'select', args });
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push({ method: 'eq', args });
    return this;
  }

  is(...args: unknown[]) {
    this.calls.push({ method: 'is', args });
    return this;
  }

  gte(...args: unknown[]) {
    this.calls.push({ method: 'gte', args });
    return this;
  }

  or(...args: unknown[]) {
    this.calls.push({ method: 'or', args });
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push({ method: 'order', args });
    return this;
  }

  limit(...args: unknown[]) {
    this.calls.push({ method: 'limit', args });
    return this;
  }

  abortSignal(...args: unknown[]) {
    this.calls.push({ method: 'abortSignal', args });
    return this;
  }

  maybeSingle() {
    this.calls.push({ method: 'maybeSingle', args: [] });
    return this;
  }

  async returns<T>(): Promise<{ data: T | null; error: unknown }> {
    return this.result as { data: T | null; error: unknown };
  }
}

const videoOne: Video = {
  id: '3d6046ad-4b13-44c3-8db0-4b63815009a8',
  userId: '4d6046ad-4b13-44c3-8db0-4b63815009a8',
  caption: 'First explore clip',
  visibility: 'public',
  status: 'ready',
  durationMs: 1200,
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
  music: null,
  profile: {
    id: '4d6046ad-4b13-44c3-8db0-4b63815009a8',
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

const videoTwo: Video = {
  ...videoOne,
  id: '5d6046ad-4b13-44c3-8db0-4b63815009a8',
  caption: 'Second explore clip',
  createdAt: '2026-01-02T00:00:00.000Z',
};

function setupClient(rows: unknown[]) {
  const videoBuilder = new MockQueryBuilder({ data: rows, error: null });
  const hashtagBuilder = new MockQueryBuilder({
    data: { id: 8 },
    error: null,
  });
  const from = vi.fn((table: string) =>
    table === 'hashtags' ? hashtagBuilder : videoBuilder,
  );
  createClientMock.mockReturnValue({ from });
  return { from, hashtagBuilder, videoBuilder };
}

describe('ExploreService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoryService.clearCache();
    getByIdsMock.mockResolvedValue([videoOne, videoTwo]);
    hydrateThumbnailsMock.mockImplementation(async (videos: Video[]) => videos);
  });

  it('returns a recent keyset page and hydrates rows in database order', async () => {
    const { videoBuilder, from } = setupClient([
      {
        id: videoOne.id,
        user_id: videoOne.userId,
        created_at: videoOne.createdAt,
        views_count: 20,
      },
      {
        id: videoTwo.id,
        user_id: videoTwo.userId,
        created_at: videoTwo.createdAt,
        views_count: 18,
      },
      {
        id: '6d6046ad-4b13-44c3-8db0-4b63815009a8',
        user_id: videoTwo.userId,
        created_at: '2026-01-01T00:00:00.000Z',
        views_count: 12,
      },
    ]);

    const result = await new ExploreService().getVideoPage(
      'recent',
      'all',
      null,
      new AbortController().signal,
      2,
    );

    expect(from).toHaveBeenCalledWith('videos');
    expect(videoBuilder.calls).toContainEqual({
      method: 'eq',
      args: ['status', 'ready'],
    });
    expect(videoBuilder.calls).toContainEqual({
      method: 'is',
      args: ['deleted_at', null],
    });
    expect(getByIdsMock).toHaveBeenCalledWith(
      [videoOne.id, videoTwo.id],
      expect.any(AbortSignal),
    );
    expect(result.items.map((video) => video.id)).toEqual([
      videoOne.id,
      videoTwo.id,
    ]);
    expect(result.nextCursor).toMatchObject({
      sort: 'recent',
      id: videoTwo.id,
      createdAt: videoTwo.createdAt,
      viewsCount: 18,
    });
  });

  it('filters category results through hashtag links and uses popularity ordering', async () => {
    const { from, videoBuilder } = setupClient([
      {
        id: videoOne.id,
        user_id: videoOne.userId,
        created_at: videoOne.createdAt,
        views_count: 20,
      },
    ]);

    await new ExploreService().getVideoPage(
      'popular',
      'dance',
      null,
      new AbortController().signal,
      1,
    );

    expect(from).toHaveBeenNthCalledWith(1, 'hashtags');
    expect(from).toHaveBeenNthCalledWith(2, 'videos');
    expect(videoBuilder.calls).toContainEqual({
      method: 'select',
      args: [
        'id,user_id,created_at,views_count,video_hashtags!inner(hashtag_id)',
      ],
    });
    expect(videoBuilder.calls).toContainEqual({
      method: 'eq',
      args: ['video_hashtags.hashtag_id', 8],
    });
    expect(videoBuilder.calls).toContainEqual({
      method: 'order',
      args: ['views_count', { ascending: false }],
    });
  });
});
