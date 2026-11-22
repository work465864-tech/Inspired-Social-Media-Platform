import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSignedUrl: vi.fn(),
  createSignedUrls: vi.fn(),
  createSignedUploads: vi.fn(),
  storageFrom: vi.fn(),
  uploadDerivative: vi.fn(),
  uploadOriginal: vi.fn(),
}));

vi.mock('../../../lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => ({
    storage: { from: mocks.storageFrom },
  }),
}));

vi.mock('../../upload/services/metadataService', () => ({
  metadataService: { createSignedUploads: mocks.createSignedUploads },
}));

vi.mock('../../upload/services/storageService', () => ({
  storageService: {
    uploadDerivative: mocks.uploadDerivative,
    uploadOriginal: mocks.uploadOriginal,
  },
}));

import { uploadBuckets } from '../../upload/constants/uploadConfig';
import { SupabaseMediaProvider } from './supabaseMediaProvider';

const provider = new SupabaseMediaProvider({
  id: 'supabase',
  signedUrlExpiresInSeconds: 3_600,
  cdnBaseUrl: null,
});
const signal = new AbortController().signal;
const progress = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storageFrom.mockReturnValue({
    createSignedUrl: mocks.createSignedUrl,
    createSignedUrls: mocks.createSignedUrls,
  });
  mocks.createSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://supabase.example/signed-video' },
    error: null,
  });
  mocks.createSignedUrls.mockResolvedValue({
    data: [
      {
        path: 'owner/video/thumbnail.jpg',
        signedUrl: 'https://supabase.example/signed-thumbnail',
        error: null,
      },
    ],
    error: null,
  });
  mocks.createSignedUploads.mockResolvedValue({
    compressed: {
      path: 'owner/video/compressed.mp4',
      signedUrl: 'https://supabase.example/upload-compressed',
    },
    thumbnail: {
      path: 'owner/video/thumbnail.jpg',
      signedUrl: 'https://supabase.example/upload-thumbnail',
    },
  });
});

describe('SupabaseMediaProvider', () => {
  it('uploads original, compressed, and thumbnail files through existing resumable transports', async () => {
    const original = new File(['video'], 'original.mp4', {
      type: 'video/mp4',
    });
    const compressed = new File(['video'], 'compressed.mp4', {
      type: 'video/mp4',
    });
    const thumbnail = new File(['image'], 'thumbnail.jpg', {
      type: 'image/jpeg',
    });

    await provider.uploadVideo({
      assetKind: 'original',
      file: original,
      objectPath: 'owner/video/original.mp4',
      signal,
      onProgress: progress,
    });
    await provider.uploadVideo({
      assetKind: 'compressed',
      file: compressed,
      objectPath: 'owner/video/compressed.mp4',
      signedUpload: {
        path: 'owner/video/compressed.mp4',
        signedUrl: 'https://supabase.example/upload-compressed',
      },
      signal,
      onProgress: progress,
    });
    await provider.uploadThumbnail({
      file: thumbnail,
      objectPath: 'owner/video/thumbnail.jpg',
      signedUpload: {
        path: 'owner/video/thumbnail.jpg',
        signedUrl: 'https://supabase.example/upload-thumbnail',
      },
      signal,
      onProgress: progress,
    });

    expect(mocks.uploadOriginal).toHaveBeenCalledWith(
      original,
      'owner/video/original.mp4',
      signal,
      progress,
    );
    expect(mocks.uploadDerivative).toHaveBeenCalledTimes(2);
  });

  it('returns signed playback and thumbnail URLs from the configured buckets', async () => {
    const playbackUrl = await provider.getPlaybackUrl({
      videoId: 'video',
      type: 'compressed',
      bucketId: uploadBuckets.compressed,
      objectPath: 'owner/video/compressed.mp4',
    });
    const thumbnailUrl = await provider.getThumbnailUrl({
      videoId: 'video',
      type: 'thumbnail',
      bucketId: uploadBuckets.thumbnail,
      objectPath: 'owner/video/thumbnail.jpg',
    });

    expect(playbackUrl).toBe('https://supabase.example/signed-video');
    expect(thumbnailUrl).toBe('https://supabase.example/signed-thumbnail');
    expect(mocks.storageFrom).toHaveBeenNthCalledWith(
      1,
      uploadBuckets.compressed,
    );
    expect(mocks.storageFrom).toHaveBeenNthCalledWith(
      2,
      uploadBuckets.thumbnail,
    );
  });

  it('requests authorized upload links and deletes draft assets through the server route', async () => {
    const paths = {
      original: 'owner/video/original.mp4',
      compressed: 'owner/video/compressed.mp4',
      thumbnail: 'owner/video/thumbnail.jpg',
    };
    await expect(
      provider.getSignedUploadUrl('video', paths, signal),
    ).resolves.toHaveProperty('compressed');

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ deleted: true }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);
    await provider.deleteVideo(
      {
        videoId: 'video',
        type: 'compressed',
        bucketId: uploadBuckets.compressed,
        objectPath: paths.compressed,
      },
      signal,
    );
    await provider.deleteThumbnail(
      {
        videoId: 'video',
        type: 'thumbnail',
        bucketId: uploadBuckets.thumbnail,
        objectPath: paths.thumbnail,
      },
      signal,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/video-uploads/video/asset',
      expect.objectContaining({
        method: 'DELETE',
        signal: expect.any(AbortSignal),
      }),
    );
    vi.unstubAllGlobals();
  });

  it('rejects a signed upload URL for a different object path', async () => {
    await expect(
      provider.uploadVideo({
        assetKind: 'compressed',
        file: new File(['video'], 'compressed.mp4', { type: 'video/mp4' }),
        objectPath: 'owner/video/compressed.mp4',
        signedUpload: {
          path: 'owner/another-video/compressed.mp4',
          signedUrl: 'https://supabase.example/upload',
        },
        signal,
        onProgress: progress,
      }),
    ).rejects.toThrow('does not match');
  });

  it('rejects files that are not valid for their media bucket', () => {
    expect(() =>
      provider.validateUpload(
        new File(['text'], 'thumbnail.txt', { type: 'text/plain' }),
        'thumbnail',
      ),
    ).toThrow('JPEG, PNG, or WebP');
  });

  it('maps server permission failures during deletion to a permission error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        ),
    );

    await expect(
      provider.deleteThumbnail(
        {
          videoId: 'video',
          type: 'thumbnail',
          bucketId: uploadBuckets.thumbnail,
          objectPath: 'owner/video/thumbnail.jpg',
        },
        signal,
      ),
    ).rejects.toMatchObject({ code: 'permission' });
    vi.unstubAllGlobals();
  });
});
