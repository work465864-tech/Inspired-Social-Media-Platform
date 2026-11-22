import { createSupabaseBrowserClient } from '../../../lib/supabase/client';
import { mediaRequestTimeoutMs } from '../constants';
import { MediaProviderError } from '../errors';
import type {
  MediaAssetReference,
  MediaProvider,
  MediaProviderConfig,
  MediaSignedUpload,
  MediaThumbnailUploadRequest,
  MediaUrlOptions,
  MediaVideoUploadRequest,
} from '../types';
import {
  uploadBuckets,
  uploadLimits,
} from '../../upload/constants/uploadConfig';
import type { UploadPaths } from '../../upload/types/upload';
import { metadataService } from '../../upload/services/metadataService';
import { storageService } from '../../upload/services/storageService';
import { VideoUploadError } from '../../upload/services/uploadErrorService';
import { acceptedVideoFormats } from '../../upload/constants/uploadConfig';
import { withTimeout } from '../../feed/services/errorService';

function getErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  if ('status' in error && typeof error.status === 'number') {
    return error.status;
  }
  if ('statusCode' in error) {
    const statusCode = Number(error.statusCode);
    return Number.isFinite(statusCode) ? statusCode : null;
  }
  return null;
}

function normalizeProviderError(error: unknown): MediaProviderError {
  if (error instanceof MediaProviderError) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    if (error.code === 'timeout') {
      return new MediaProviderError(
        'timeout',
        'The media request timed out.',
        true,
      );
    }
    if (error.code === 'offline') {
      return new MediaProviderError(
        'network',
        'The media request could not reach Storage.',
        true,
      );
    }
    if (error.code === 'aborted') {
      return new MediaProviderError(
        'cancelled',
        'The media request was cancelled.',
      );
    }
    if (error.code === '42501' || error.code === 'PGRST301') {
      return new MediaProviderError(
        'permission',
        'You do not have permission to access this media.',
      );
    }
  }

  const status = getErrorStatus(error);
  if (status === 401 || status === 403 || status === 42501) {
    return new MediaProviderError(
      'permission',
      'You do not have permission to access this media.',
    );
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return new MediaProviderError(
      'timeout',
      'The media request timed out.',
      true,
    );
  }
  if (error instanceof TypeError) {
    return new MediaProviderError(
      'network',
      'The media request could not reach Storage.',
      true,
    );
  }
  if (status !== null && status >= 500) {
    return new MediaProviderError(
      'provider_error',
      'The media provider is temporarily unavailable.',
      true,
    );
  }
  return new MediaProviderError(
    'provider_error',
    'The media provider could not complete the request.',
  );
}

function expectedVideoBucket(asset: MediaAssetReference): string {
  if (asset.type === 'original') {
    return uploadBuckets.original;
  }
  if (asset.type === 'compressed') {
    return uploadBuckets.compressed;
  }
  throw new MediaProviderError(
    'invalid_file',
    'A video playback URL requires a video asset.',
  );
}

export class SupabaseMediaProvider implements MediaProvider {
  readonly id = 'supabase' as const;

  constructor(private readonly config: MediaProviderConfig) {}

  async uploadVideo(request: MediaVideoUploadRequest): Promise<void> {
    this.validateUpload(request.file, request.assetKind);
    if (request.assetKind === 'original') {
      if (request.signedUpload) {
        throw new VideoUploadError(
          'storage_error',
          'Original uploads use the authenticated resumable upload endpoint.',
        );
      }
      await storageService.uploadOriginal(
        request.file,
        request.objectPath,
        request.signal,
        request.onProgress,
      );
      return;
    }

    this.validateSignedUpload(request.signedUpload, request.objectPath);
    await storageService.uploadDerivative(
      request.signedUpload,
      request.file,
      request.signal,
      request.onProgress,
    );
  }

  async uploadThumbnail(request: MediaThumbnailUploadRequest): Promise<void> {
    this.validateUpload(request.file, 'thumbnail');
    this.validateSignedUpload(request.signedUpload, request.objectPath);
    await storageService.uploadDerivative(
      request.signedUpload,
      request.file,
      request.signal,
      request.onProgress,
    );
  }

  async getSignedUploadUrl(
    videoId: string,
    paths: UploadPaths,
    signal: AbortSignal,
  ): Promise<{ compressed: MediaSignedUpload; thumbnail: MediaSignedUpload }> {
    try {
      return await this.withMediaTimeout(
        (requestSignal) =>
          metadataService.createSignedUploads(videoId, paths, requestSignal),
        signal,
      );
    } catch (error) {
      if (error instanceof VideoUploadError) {
        throw error;
      }
      throw normalizeProviderError(error);
    }
  }

  validateUpload(
    file: File,
    assetKind: 'original' | 'compressed' | 'thumbnail',
  ): void {
    if (file.size <= 0) {
      throw new VideoUploadError('corrupted_file', 'The media file is empty.');
    }

    if (assetKind === 'thumbnail') {
      if (file.size > uploadLimits.maxThumbnailBytes) {
        throw new VideoUploadError(
          'file_too_large',
          'The thumbnail exceeds the Storage limit.',
        );
      }
      if (
        file.type !== 'image/jpeg' &&
        file.type !== 'image/png' &&
        file.type !== 'image/webp'
      ) {
        throw new VideoUploadError(
          'unsupported_format',
          'Use a JPEG, PNG, or WebP thumbnail.',
        );
      }
      return;
    }

    if (file.size > uploadLimits.maxStoredVideoBytes) {
      throw new VideoUploadError(
        'file_too_large',
        'The video exceeds the Storage limit.',
      );
    }
    const allowedMimeTypes =
      assetKind === 'original'
        ? Object.values(acceptedVideoFormats).map((format) => format.mimeType)
        : ['video/mp4', 'video/webm'];
    if (!allowedMimeTypes.includes(file.type)) {
      throw new VideoUploadError(
        'unsupported_format',
        'The video format is not supported by this Storage bucket.',
      );
    }
  }

  async deleteVideo(
    asset: MediaAssetReference,
    signal: AbortSignal,
  ): Promise<void> {
    if (asset.type !== 'original' && asset.type !== 'compressed') {
      throw new MediaProviderError(
        'invalid_file',
        'Deleting a video requires an original or compressed asset.',
      );
    }
    const bucketId = expectedVideoBucket(asset);
    if (asset.bucketId !== bucketId) {
      throw new MediaProviderError(
        'invalid_file',
        'The video asset references an unexpected Storage bucket.',
      );
    }
    await this.deleteDraftAsset(asset, signal);
  }

  async deleteThumbnail(
    asset: MediaAssetReference,
    signal: AbortSignal,
  ): Promise<void> {
    if (
      asset.type !== 'thumbnail' ||
      asset.bucketId !== uploadBuckets.thumbnail
    ) {
      throw new MediaProviderError(
        'invalid_file',
        'The thumbnail references an unexpected Storage bucket.',
      );
    }
    await this.deleteDraftAsset(asset, signal);
  }

  async getPlaybackUrl(
    asset: MediaAssetReference,
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const bucketId = expectedVideoBucket(asset);
    if (asset.bucketId !== bucketId) {
      throw new MediaProviderError(
        'invalid_file',
        'The video asset references an unexpected Storage bucket.',
      );
    }

    try {
      const { data, error } = await this.withMediaTimeout(
        () =>
          createSupabaseBrowserClient()
            .storage.from(bucketId)
            .createSignedUrl(
              asset.objectPath,
              this.getSignedUrlLifetime(options),
            ),
        signal,
      );
      if (error) {
        throw error;
      }
      return data.signedUrl;
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  async getThumbnailUrl(
    asset: MediaAssetReference,
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<string> {
    const urls = await this.getThumbnailUrls([asset], options, signal);
    const url = urls.get(asset.objectPath);
    if (!url) {
      throw new MediaProviderError(
        'provider_error',
        'The media provider did not return a thumbnail URL.',
      );
    }
    return url;
  }

  async getThumbnailUrls(
    assets: readonly MediaAssetReference[],
    options: MediaUrlOptions = {},
    signal?: AbortSignal,
  ): Promise<Map<string, string>> {
    const thumbnails = assets.filter((asset) => asset.type === 'thumbnail');
    if (thumbnails.length === 0) {
      return new Map();
    }
    if (
      thumbnails.some((asset) => asset.bucketId !== uploadBuckets.thumbnail)
    ) {
      throw new MediaProviderError(
        'invalid_file',
        'A thumbnail references an unexpected Storage bucket.',
      );
    }

    try {
      const paths = [...new Set(thumbnails.map((asset) => asset.objectPath))];
      const { data, error } = await this.withMediaTimeout(
        () =>
          createSupabaseBrowserClient()
            .storage.from(uploadBuckets.thumbnail)
            .createSignedUrls(paths, this.getSignedUrlLifetime(options)),
        signal,
      );
      if (error) {
        throw error;
      }

      return new Map(
        data.flatMap((asset) =>
          asset.path && asset.signedUrl && !asset.error
            ? [[asset.path, asset.signedUrl] as const]
            : [],
        ),
      );
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  private validateSignedUpload(
    signedUpload: MediaSignedUpload | undefined,
    expectedPath: string,
  ): asserts signedUpload is MediaSignedUpload {
    if (!signedUpload || signedUpload.path !== expectedPath) {
      throw new VideoUploadError(
        'storage_error',
        'The secure upload link does not match the media path.',
      );
    }
  }

  private getSignedUrlLifetime(options: MediaUrlOptions): number {
    const lifetime =
      options.expiresInSeconds ?? this.config.signedUrlExpiresInSeconds;
    if (!Number.isSafeInteger(lifetime) || lifetime < 1 || lifetime > 86_400) {
      throw new MediaProviderError(
        'invalid_file',
        'The signed media URL lifetime is invalid.',
      );
    }
    return lifetime;
  }

  private async deleteDraftAsset(
    asset: MediaAssetReference,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const response = await this.withMediaTimeout(
        (requestSignal) =>
          fetch(
            `/api/video-uploads/${encodeURIComponent(asset.videoId)}/asset`,
            {
              method: 'DELETE',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                assetKind: asset.type,
                bucketId: asset.bucketId,
                objectPath: asset.objectPath,
              }),
              signal: requestSignal,
            },
          ),
        signal,
      );
      if (!response.ok) {
        throw new MediaProviderError(
          response.status === 401 || response.status === 403
            ? 'permission'
            : response.status >= 500
              ? 'provider_error'
              : 'upload_failed',
          'The media asset could not be deleted.',
          response.status >= 500,
        );
      }
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  private async withMediaTimeout<Result>(
    request: (signal: AbortSignal) => PromiseLike<Result>,
    parentSignal?: AbortSignal,
  ): Promise<Result> {
    const controller = new AbortController();
    const abortFromParent = () =>
      controller.abort(
        parentSignal?.reason ?? new DOMException('Aborted', 'AbortError'),
      );
    if (parentSignal?.aborted) {
      abortFromParent();
    } else {
      parentSignal?.addEventListener('abort', abortFromParent, { once: true });
    }
    const timeout = setTimeout(
      () => controller.abort(new DOMException('Timed out', 'TimeoutError')),
      mediaRequestTimeoutMs,
    );
    try {
      if (controller.signal.aborted) {
        throw controller.signal.reason;
      }
      return await withTimeout(
        Promise.resolve().then(() => request(controller.signal)),
        controller.signal,
        mediaRequestTimeoutMs,
      );
    } finally {
      clearTimeout(timeout);
      parentSignal?.removeEventListener('abort', abortFromParent);
    }
  }
}
