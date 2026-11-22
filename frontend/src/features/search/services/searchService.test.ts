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
import { SearchService } from './searchService';
import { mediaService } from '../../feed/services/mediaService';
import { videoService } from '../../feed/services/videoService';

type QueryResult = {
  data: unknown;
  error: unknown;
};

type QueryTrace = {
  method: string;
  args: unknown[];
};

class MockQueryBuilder {
  readonly calls: QueryTrace[] = [];

  constructor(private readonly result: QueryResult) {}

  select(...args: unknown[]): this {
    this.calls.push({ method: 'select', args });
    return this;
  }

  eq(...args: unknown[]): this {
    this.calls.push({ method: 'eq', args });
    return this;
  }

  is(...args: unknown[]): this {
    this.calls.push({ method: 'is', args });
    return this;
  }

  or(...args: unknown[]): this {
    this.calls.push({ method: 'or', args });
    return this;
  }

  ilike(...args: unknown[]): this {
    this.calls.push({ method: 'ilike', args });
    return this;
  }

  gt(...args: unknown[]): this {
    this.calls.push({ method: 'gt', args });
    return this;
  }

  order(...args: unknown[]): this {
    this.calls.push({ method: 'order', args });
    return this;
  }

  limit(...args: unknown[]): this {
    this.calls.push({ method: 'limit', args });
    return this;
  }

  abortSignal(...args: unknown[]): this {
    this.calls.push({ method: 'abortSignal', args });
    return this;
  }

  async returns<T>(): Promise<{ data: T | null; error: unknown }> {
    return this.result as { data: T | null; error: unknown };
  }
}

const video: Video = {
  id: '3d6046ad-4b13-44c3-8db0-4b63815009a8',
  userId: '4d6046ad-4b13-44c3-8db0-4b63815009a8',
  caption: 'A searchable clip',
  visibility: 'public',
  status: 'ready',
  durationMs: 1200,
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  music: null,
  profile: {
    id: '4d6046ad-4b13-44c3-8db0-4b63815009a8',
    username: 'creator',
    displayName: 'Creator',
    avatarUrl: null,
    isVerified: false,
    isPrivate: false,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  assets: [],
  stats: {
    viewsCount: 12,
    likesCount: 2,
    commentsCount: 0,
    sharesCount: null,
    bookmarksCount: null,
  },
};

function createMockClient(result: QueryResult) {
  const builder = new MockQueryBuilder(result);
  const client = { from: vi.fn(() => builder) };
  createClientMock.mockReturnValue(client);
  return { builder, client };
}

const signal = new AbortController().signal;
const filters = { verifiedOnly: false, videoSort: 'recent' as const };

describe('SearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches active profiles and returns the next username cursor', async () => {
    const { builder, client } = createMockClient({
      data: [
        {
          id: '00000000-0000-4000-8000-000000000001',
          username: 'alpha',
          full_name: 'Alpha Creator',
          avatar_url: null,
          is_verified: true,
          is_private: false,
          bio: '',
        },
        {
          id: '00000000-0000-4000-8000-000000000002',
          username: 'beta',
          full_name: 'Beta Creator',
          avatar_url: null,
          is_verified: false,
          is_private: false,
          bio: '',
        },
      ],
      error: null,
    });

    const result = await new SearchService().searchPage(
      'creator',
      'people',
      null,
      filters,
      1,
      signal,
    );

    expect(client.from).toHaveBeenCalledWith('profiles');
    expect(builder.calls).toContainEqual({
      method: 'eq',
      args: ['status', 'active'],
    });
    expect(result.items[0]).toMatchObject({
      kind: 'user',
      user: { username: 'alpha', displayName: 'Alpha Creator' },
    });
    expect(result.nextCursor).toEqual({ target: 'people', username: 'alpha' });
  });

  it('searches ready videos, hydrates display data, and preserves popular cursors', async () => {
    const { client } = createMockClient({
      data: [
        {
          id: video.id,
          created_at: video.createdAt,
          views_count: video.stats.viewsCount,
        },
        {
          id: '5d6046ad-4b13-44c3-8db0-4b63815009a8',
          created_at: video.createdAt,
          views_count: 10,
        },
      ],
      error: null,
    });
    vi.mocked(videoService.getByIds).mockResolvedValue([video]);
    vi.mocked(mediaService.hydrateThumbnails).mockResolvedValue([video]);

    const result = await new SearchService().searchPage(
      'clip',
      'videos',
      null,
      { ...filters, videoSort: 'popular' },
      1,
      signal,
    );

    expect(client.from).toHaveBeenCalledWith('videos');
    expect(videoService.getByIds).toHaveBeenCalledWith(
      [video.id],
      expect.any(AbortSignal),
    );
    expect(result.items).toEqual([{ kind: 'video', video }]);
    expect(result.nextCursor).toEqual({
      target: 'videos',
      sort: 'popular',
      viewsCount: 12,
      createdAt: video.createdAt,
      id: video.id,
    });
  });

  it('searches hashtags and advances with a slug cursor', async () => {
    const { builder, client } = createMockClient({
      data: [
        { id: 1, slug: 'connectly' },
        { id: 2, slug: 'connectlyvideo' },
      ],
      error: null,
    });

    const result = await new SearchService().searchPage(
      '#connectly',
      'hashtags',
      null,
      filters,
      1,
      signal,
    );

    expect(client.from).toHaveBeenCalledWith('hashtags');
    expect(builder.calls).toContainEqual({
      method: 'ilike',
      args: ['slug', '%connectly%'],
    });
    expect(result.items[0]).toEqual({
      kind: 'hashtag',
      hashtag: { id: 1, slug: 'connectly' },
    });
    expect(result.nextCursor).toEqual({
      target: 'hashtags',
      slug: 'connectly',
    });
  });
});
