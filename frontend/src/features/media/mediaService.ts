import { MediaUrlResolver } from './mediaUrlResolver';
import { mediaConfig } from './mediaConfig';
import { mediaFactory } from './mediaProvider';
import type {
  MediaAssetReference,
  MediaProvider,
  MediaSignedUploadBundle,
  MediaThumbnailUploadRequest,
  MediaUrlOptions,
  MediaVideoUploadRequest,
} from './types';
import type { UploadPaths } from '../upload/types/upload';

export class MediaService {
  private readonly urlResolver: MediaUrlResolver;

  constructor(
    readonly provider: MediaProvider,
    urlResolver?: MediaUrlResolver,
  ) {
    this.urlResolver =
      urlResolver ?? new MediaUrlResolver(provider, mediaConfig);
  }

  get providerId() {
    return this.provider.id;
  }

  uploadVideo(request: MediaVideoUploadRequest): Promise<void> {
    return this.provider.uploadVideo(request);
  }

  deleteVideo(asset: MediaAssetReference, signal: AbortSignal): Promise<void> {
    return this.provider.deleteVideo(asset, signal);
  }

  uploadThumbnail(request: MediaThumbnailUploadRequest): Promise<void> {
    return this.provider.uploadThumbnail(request);
  }

  deleteThumbnail(
    asset: MediaAssetReference,
    signal: AbortSignal,
  ): Promise<void> {
    return this.provider.deleteThumbnail(asset, signal);
  }

  getPlaybackUrl(
    asset: MediaAssetReference,
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.urlResolver.getPlaybackUrl(asset, options, signal);
  }

  getThumbnailUrl(
    asset: MediaAssetReference,
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.urlResolver.getThumbnailUrl(asset, options, signal);
  }

  getThumbnailUrls(
    assets: readonly MediaAssetReference[],
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<Map<string, string>> {
    return this.urlResolver.getThumbnailUrls(assets, options, signal);
  }

  getSignedUploadUrl(
    videoId: string,
    paths: UploadPaths,
    signal: AbortSignal,
  ): Promise<MediaSignedUploadBundle> {
    return this.provider.getSignedUploadUrl(videoId, paths, signal);
  }

  validateUpload(
    file: File,
    assetKind: Parameters<MediaProvider['validateUpload']>[1],
  ): void {
    this.provider.validateUpload(file, assetKind);
  }
}

const defaultMediaProvider = mediaFactory.create(mediaConfig);

export const mediaService = new MediaService(defaultMediaProvider);
