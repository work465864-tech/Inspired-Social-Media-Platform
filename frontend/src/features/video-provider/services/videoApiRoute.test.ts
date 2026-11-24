import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VideoProviderError } from '../errors';
import type { VideoProvider } from '../providers/videoProvider';
import { ProviderVideoRepository } from './videoRepository';
import { VideoService } from './videoService';

const mocks = vi.hoisted(() => ({
  getVideoService: vi.fn(),
}));

vi.mock('./feedProviderFactory', () => ({
  getVideoService: mocks.getVideoService,
}));

import { getVideoService } from './feedProviderFactory';
import { handleVideoPageRequest } from './videoApiRoute';

function configureProvider(provider: VideoProvider): void {
  vi.mocked(getVideoService).mockReturnValue(
    new VideoService(new ProviderVideoRepository(provider)),
  );
}

describe('handleVideoPageRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns available videos with complete source metadata', async () => {
    const provider: VideoProvider = {
      id: 'pixabay',
      getPage: vi.fn().mockResolvedValue({
        items: [],
        nextPage: null,
        totalHits: 0,
      }),
    };
    configureProvider(provider);

    const response = await handleVideoPageRequest(
      new NextRequest('https://connectly.example/api/videos?page=1'),
      'feed',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [],
      nextPage: null,
      totalHits: 0,
      metadata: {
        status: 'complete',
        unavailableSources: [],
      },
    });
  });

  it('degrades provider failures to an empty HTTP 200 response', async () => {
    const provider: VideoProvider = {
      id: 'pixabay',
      getPage: vi
        .fn()
        .mockRejectedValue(
          new VideoProviderError(
            502,
            'provider',
            'The video provider is temporarily unavailable.',
          ),
        ),
    };
    configureProvider(provider);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const response = await handleVideoPageRequest(
      new NextRequest('https://connectly.example/api/videos?page=1'),
      'feed',
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [],
      nextPage: null,
      totalHits: 0,
      metadata: {
        status: 'unavailable',
        unavailableSources: ['pixabay'],
      },
    });
    expect(warning).toHaveBeenCalledWith(
      'Video provider unavailable:',
      expect.objectContaining({ provider: 'pixabay', code: 'provider' }),
    );
  });

  it('still returns client errors for invalid page requests', async () => {
    const response = await handleVideoPageRequest(
      new NextRequest('https://connectly.example/api/videos?page=0'),
      'feed',
    );

    expect(response.status).toBe(400);
    expect(getVideoService).not.toHaveBeenCalled();
  });
});
