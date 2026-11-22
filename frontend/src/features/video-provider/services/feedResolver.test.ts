import { describe, expect, it, vi } from 'vitest';
import type { DatabaseCandidateProvider } from '../providers/databaseVideoProvider';
import type { FeedProvider } from '../providers/feedProvider';
import type { Video, VideoPage, VideoPageRequest } from '../types';
import { FeedCache } from './feedCache';
import { FeedResolver } from './feedResolver';

function makeVideo(id: string): Video {
  return {
    id,
    title: `Video ${id}`,
    description: '',
    thumbnail: null,
    playbackUrl: `https://cdn.example/${id}.mp4`,
    duration: 10,
    width: 720,
    height: 1280,
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    creator: { id: 'creator', name: 'Creator', avatarUrl: null },
    createdAt: '2026-01-01T00:00:00.000Z',
    isDemoContent: false,
    attribution: {
      label: 'Connectly',
      url: `https://cdn.example/${id}.mp4`,
    },
  };
}

function makeDatabaseProvider(candidates: Video[]): DatabaseCandidateProvider {
  return {
    id: 'supabase',
    getCurrentUserId: async () => 'user-1',
    getCandidates: async () => candidates,
    getPage: async (request: VideoPageRequest): Promise<VideoPage> => ({
      items: candidates.slice(
        (request.page - 1) * request.pageSize,
        request.page * request.pageSize,
      ),
      nextPage: null,
      totalHits: candidates.length,
    }),
  };
}

function makeRequest(page = 1): VideoPageRequest {
  return { kind: 'feed', page, pageSize: 3 };
}

describe('FeedResolver', () => {
  it('does not request the fallback while the database fills the page', async () => {
    const fallback: FeedProvider = {
      id: 'pixabay',
      getPage: vi.fn(),
    };
    const resolver = new FeedResolver(
      makeDatabaseProvider([
        makeVideo('db-1'),
        makeVideo('db-2'),
        makeVideo('db-3'),
      ]),
      fallback,
      new FeedCache(),
    );

    const page = await resolver.resolve(
      makeRequest(),
      new AbortController().signal,
    );

    expect(page.items.map((video) => video.id)).toEqual([
      'db-1',
      'db-2',
      'db-3',
    ]);
    expect(fallback.getPage).not.toHaveBeenCalled();
  });

  it('fills an insufficient database page and deduplicates provider IDs', async () => {
    const fallback: FeedProvider = {
      id: 'pixabay',
      getPage: vi.fn().mockResolvedValue({
        items: [makeVideo('db-1'), makeVideo('demo-1'), makeVideo('demo-2')],
        nextPage: null,
        totalHits: 3,
      }),
    };
    const resolver = new FeedResolver(
      makeDatabaseProvider([makeVideo('db-1')]),
      fallback,
      new FeedCache(),
    );

    const page = await resolver.resolve(
      makeRequest(),
      new AbortController().signal,
    );

    expect(page.items.map((video) => video.id)).toEqual([
      'db-1',
      'demo-1',
      'demo-2',
    ]);
    expect(fallback.getPage).toHaveBeenCalledOnce();
  });

  it('uses the cached hybrid page when the fallback fails during refresh', async () => {
    const cache = new FeedCache();
    const fallback: FeedProvider = {
      id: 'pixabay',
      getPage: vi
        .fn()
        .mockResolvedValueOnce({
          items: [makeVideo('demo-1'), makeVideo('demo-2')],
          nextPage: 2,
          totalHits: 3,
        })
        .mockRejectedValueOnce(new Error('Pixabay is unavailable')),
    };
    const resolver = new FeedResolver(
      makeDatabaseProvider([makeVideo('db-1')]),
      fallback,
      cache,
    );

    const firstPage = await resolver.resolve(
      makeRequest(),
      new AbortController().signal,
    );
    const refreshedPage = await resolver.resolve(
      makeRequest(),
      new AbortController().signal,
    );

    expect(refreshedPage.items.map((video) => video.id)).toEqual(
      firstPage.items.map((video) => video.id),
    );
  });

  it('switches to Pixabay when every database source fails', async () => {
    const database = makeDatabaseProvider([]);
    database.getCandidates = vi
      .fn()
      .mockRejectedValue(new Error('Supabase is unavailable'));
    const fallback: FeedProvider = {
      id: 'pixabay',
      getPage: vi.fn().mockResolvedValue({
        items: [makeVideo('demo-1'), makeVideo('demo-2'), makeVideo('demo-3')],
        nextPage: null,
        totalHits: 3,
      }),
    };
    const resolver = new FeedResolver(database, fallback, new FeedCache());

    const page = await resolver.resolve(
      makeRequest(),
      new AbortController().signal,
    );

    expect(page.items.map((video) => video.id)).toEqual([
      'demo-1',
      'demo-2',
      'demo-3',
    ]);
  });

  it('reports an error when both providers fail and no cached feed exists', async () => {
    const database = makeDatabaseProvider([]);
    database.getCandidates = vi
      .fn()
      .mockRejectedValue(new Error('Supabase is unavailable'));
    const fallback: FeedProvider = {
      id: 'pixabay',
      getPage: vi.fn().mockRejectedValue(new Error('Pixabay is unavailable')),
    };
    const resolver = new FeedResolver(database, fallback, new FeedCache());

    await expect(
      resolver.resolve(makeRequest(), new AbortController().signal),
    ).rejects.toMatchObject({
      status: 503,
      message: 'The database and fallback video sources are unavailable.',
    });
  });
});
