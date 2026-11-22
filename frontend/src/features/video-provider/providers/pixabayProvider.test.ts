import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PixabayProvider } from './pixabayProvider';
import type { PixabayFetchOptions, PixabayTransport } from './pixabayTypes';
import { VideoProviderError } from '../errors';

const apiPayload = {
  total: 1,
  totalHits: 1,
  hits: [
    {
      id: 42,
      pageURL: 'https://pixabay.com/videos/id-42/',
      tags: 'ocean, waves, sunset',
      duration: 12,
      videos: {
        medium: {
          url: 'https://cdn.pixabay.com/video/ocean-medium.mp4',
          width: 1280,
          height: 720,
          thumbnail: 'https://cdn.pixabay.com/video/ocean-medium.jpg',
        },
      },
      views: 1200,
      likes: 8,
      comments: 2,
      user_id: 7,
      user: 'Creator',
      userImageURL: 'https://cdn.pixabay.com/user/creator.jpg',
    },
  ],
};

describe('PixabayProvider', () => {
  beforeEach(() => {
    vi.stubEnv('PIXABAY_API_KEY', 'video-provider-test-key');
  });

  it('fetches and normalizes a page without returning the API key', async () => {
    const calls: Array<{ url: URL; options: PixabayFetchOptions }> = [];
    const fetch = vi.fn(async (url: URL, options: PixabayFetchOptions) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(apiPayload), { status: 200 });
    });
    const provider = new PixabayProvider({ fetch } satisfies PixabayTransport);
    const page = await provider.getPage(
      { kind: 'feed', page: 1, pageSize: 12 },
      new AbortController().signal,
    );

    expect(fetch).toHaveBeenCalledOnce();
    const call = calls[0];
    expect(call?.url.searchParams.get('key')).toBe('video-provider-test-key');
    expect(call?.url.searchParams.get('order')).toBe('latest');
    expect(call?.url.searchParams.get('safesearch')).toBe('true');
    expect(call?.options.next?.revalidate).toBe(86_400);
    expect(page).toMatchObject({
      nextPage: null,
      totalHits: 1,
      items: [
        {
          id: '42',
          title: 'ocean · waves · sunset',
          playbackUrl: 'https://cdn.pixabay.com/video/ocean-medium.mp4',
          duration: 12,
          views: 1200,
          likes: 8,
          comments: 2,
          shares: 0,
          createdAt: null,
          isDemoContent: true,
        },
      ],
    });
    expect(JSON.stringify(page)).not.toContain('video-provider-test-key');
  });

  it('maps Pixabay rate limits and reset time to a retryable API error', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('rate limited', {
          status: 429,
          headers: { 'x-ratelimit-reset': '30' },
        }),
    );
    const provider = new PixabayProvider({ fetch } satisfies PixabayTransport);

    await expect(
      provider.getPage(
        { kind: 'trending', page: 1, pageSize: 12 },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject<Partial<VideoProviderError>>({
      status: 429,
      code: 'rate_limit',
      retryAfterSeconds: 30,
    });
  });

  it('encodes search terms and uses popular ordering', async () => {
    const calls: Array<{ url: URL; options: PixabayFetchOptions }> = [];
    const fetch = vi.fn(async (url: URL, options: PixabayFetchOptions) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(apiPayload), { status: 200 });
    });
    const provider = new PixabayProvider({ fetch } satisfies PixabayTransport);

    await provider.getPage(
      {
        kind: 'search',
        query: 'ocean & waves',
        page: 1,
        pageSize: 12,
      },
      new AbortController().signal,
    );

    expect(calls[0]?.url.searchParams.get('q')).toBe('ocean & waves');
    expect(calls[0]?.url.searchParams.get('order')).toBe('popular');
  });

  it('fails explicitly when the server key is not configured', async () => {
    vi.stubEnv('PIXABAY_API_KEY', '');
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
    const provider = new PixabayProvider({ fetch } satisfies PixabayTransport);

    await expect(
      provider.getPage(
        { kind: 'feed', page: 1, pageSize: 12 },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ status: 503, code: 'configuration' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
