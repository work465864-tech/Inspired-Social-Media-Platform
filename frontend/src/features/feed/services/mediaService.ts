import { FeedDataError, normalizeFeedError } from './errorService';
import { MediaProviderError } from '../../media/errors';
import { mediaService as providerMediaService } from '../../media/mediaService';
import type { MediaAsset, Video } from '../types/models';

function toFeedDataError(error: unknown): FeedDataError {
  if (!(error instanceof MediaProviderError)) {
    return normalizeFeedError(error);
  }

  switch (error.code) {
    case 'network':
      return new FeedDataError('offline', error.message);
    case 'timeout':
      return new FeedDataError('timeout', error.message);
    case 'permission':
      return new FeedDataError('unauthorized', error.message);
    case 'invalid_file':
      return new FeedDataError('invalid_data', error.message);
    case 'provider_error':
    case 'upload_failed':
      return new FeedDataError('server', error.message);
    case 'cancelled':
      return new FeedDataError('aborted', error.message);
  }

  return new FeedDataError('unknown', error.message);
}

export const mediaService = {
  async hydrateThumbnails(
    videos: Video[],
    signal: AbortSignal,
  ): Promise<Video[]> {
    const signedThumbnails = await this.signThumbnails(
      videos.flatMap((video) => video.assets),
      signal,
    );

    return videos.map((video) => ({
      ...video,
      assets: video.assets.map((asset) => ({
        ...asset,
        signedUrl: signedThumbnails.get(asset.objectPath) ?? null,
      })),
    }));
  },

  async signThumbnails(
    assets: MediaAsset[],
    signal: AbortSignal,
  ): Promise<Map<string, string>> {
    const thumbnails = assets.filter((asset) => asset.type === 'thumbnail');
    if (thumbnails.length === 0) {
      return new Map();
    }

    if (thumbnails.some((asset) => asset.bucketId !== 'thumbnails')) {
      throw new FeedDataError(
        'invalid_data',
        'A thumbnail references an unexpected storage bucket.',
      );
    }

    try {
      return await providerMediaService.getThumbnailUrls(
        thumbnails,
        { access: 'signed' },
        signal,
      );
    } catch (error) {
      throw toFeedDataError(error);
    }
  },
};
