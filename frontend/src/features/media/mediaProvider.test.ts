import { describe, expect, it, vi } from 'vitest';
import { MediaConfigurationError } from './errors';
import { MediaFactory } from './mediaProvider';
import { MediaUrlResolver } from './mediaUrlResolver';
import type {
  MediaProvider,
  MediaProviderConfig,
  MediaProviderRegistry,
} from './types';

const config = (
  id: MediaProviderConfig['id'],
  cdnBaseUrl: string | null = null,
): MediaProviderConfig => ({
  id,
  cdnBaseUrl,
  signedUrlExpiresInSeconds: 3_600,
});

function createFakeProvider(id: MediaProvider['id']): MediaProvider {
  return {
    id,
    uploadVideo: vi.fn().mockResolvedValue(undefined),
    deleteVideo: vi.fn().mockResolvedValue(undefined),
    uploadThumbnail: vi.fn().mockResolvedValue(undefined),
    deleteThumbnail: vi.fn().mockResolvedValue(undefined),
    getPlaybackUrl: vi
      .fn()
      .mockResolvedValue('https://origin.example/video.mp4'),
    getThumbnailUrl: vi
      .fn()
      .mockResolvedValue('https://origin.example/thumbnail.jpg'),
    getThumbnailUrls: vi
      .fn()
      .mockResolvedValue(
        new Map([
          ['video/thumbnail.jpg', 'https://origin.example/thumbnail.jpg'],
        ]),
      ),
    getSignedUploadUrl: vi.fn().mockResolvedValue({
      compressed: {
        path: 'compressed.mp4',
        signedUrl: 'https://upload.example/c',
      },
      thumbnail: {
        path: 'thumbnail.jpg',
        signedUrl: 'https://upload.example/t',
      },
    }),
    validateUpload: vi.fn(),
  };
}

describe('media provider architecture', () => {
  it('selects an injected provider by configuration and rejects unregistered providers', () => {
    const cloudProvider = createFakeProvider('cloudflare-r2');
    const createCloudProvider = vi.fn(() => cloudProvider);
    const registry: MediaProviderRegistry = {
      'cloudflare-r2': createCloudProvider,
    };
    const factory = new MediaFactory(registry);

    expect(factory.create(config('cloudflare-r2'))).toBe(cloudProvider);
    expect(createCloudProvider).toHaveBeenCalledWith(config('cloudflare-r2'));
    expect(() => factory.create(config('amazon-s3'))).toThrow(
      MediaConfigurationError,
    );
  });

  it('uses the CDN only for public, unsigned URLs', async () => {
    const provider = createFakeProvider('bunny');
    const resolver = new MediaUrlResolver(
      provider,
      config('bunny', 'https://cdn.example/media'),
    );
    const asset = {
      videoId: 'video',
      type: 'compressed' as const,
      bucketId: 'videos-compressed',
      objectPath: 'owner/video.mp4',
    };

    await expect(
      resolver.getPlaybackUrl(asset, { access: 'public', useCdn: true }),
    ).resolves.toBe('https://cdn.example/media/video.mp4');
    vi.mocked(provider.getPlaybackUrl).mockResolvedValue(
      'https://origin.example/signed?token=secret',
    );
    await expect(
      resolver.getPlaybackUrl(asset, { access: 'public', useCdn: true }),
    ).resolves.toBe('https://origin.example/signed?token=secret');
  });
});
