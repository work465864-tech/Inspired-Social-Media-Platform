import type { MediaMetadata } from '../../../types/media';
import type {
  GeneratedThumbnails,
  PreparedPublishPayload,
} from '../types/processing';

export class PublishPreparationService {
  prepare(input: {
    original: File;
    compressedVideo: File;
    thumbnails: GeneratedThumbnails;
    previewClip: File;
    metadata: MediaMetadata;
  }): PreparedPublishPayload {
    const { original, compressedVideo, thumbnails, previewClip, metadata } =
      input;
    if (
      [
        original,
        compressedVideo,
        thumbnails.primary,
        thumbnails.poster,
        previewClip,
      ].some((asset) => asset.size === 0)
    ) {
      throw new Error('A processed media asset is empty.');
    }

    return {
      version: 1,
      metadata,
      assets: {
        original,
        compressedVideo,
        primaryThumbnail: thumbnails.primary,
        poster: thumbnails.poster,
        previewClip,
      },
    };
  }
}

export const publishPreparationService = new PublishPreparationService();
