import type { MediaAsset } from '../feed/types/models';
import type { UploadPaths } from '../upload/types/upload';

export type MediaProviderId =
  'supabase' | 'peertube' | 'cloudflare-r2' | 'amazon-s3' | 'bunny' | 'local';

export type MediaAssetKind = 'original' | 'compressed' | 'thumbnail';
export type VideoAssetKind = Exclude<MediaAssetKind, 'thumbnail'>;

export type MediaSignedUpload = {
  path: string;
  signedUrl: string;
};

export type MediaSignedUploadBundle = {
  compressed: MediaSignedUpload;
  thumbnail: MediaSignedUpload;
};

export type MediaVideoUploadRequest = {
  assetKind: VideoAssetKind;
  file: File;
  objectPath: string;
  signedUpload?: MediaSignedUpload;
  signal: AbortSignal;
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
};

export type MediaThumbnailUploadRequest = {
  file: File;
  objectPath: string;
  signedUpload: MediaSignedUpload;
  signal: AbortSignal;
  onProgress: (bytesUploaded: number, bytesTotal: number) => void;
};

export type MediaAssetReference = Pick<
  MediaAsset,
  'bucketId' | 'objectPath' | 'type'
> & {
  videoId: string;
};

export type MediaUrlOptions = {
  access?: 'public' | 'signed';
  expiresInSeconds?: number;
  useCdn?: boolean;
};

export type MediaProviderConfig = {
  id: MediaProviderId;
  signedUrlExpiresInSeconds: number;
  cdnBaseUrl: string | null;
};

export type MediaConfig = MediaProviderConfig;

export interface MediaProvider {
  readonly id: MediaProviderId;
  uploadVideo(request: MediaVideoUploadRequest): Promise<void>;
  deleteVideo(asset: MediaAssetReference, signal: AbortSignal): Promise<void>;
  uploadThumbnail(request: MediaThumbnailUploadRequest): Promise<void>;
  deleteThumbnail(
    asset: MediaAssetReference,
    signal: AbortSignal,
  ): Promise<void>;
  getPlaybackUrl(
    asset: MediaAssetReference,
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<string>;
  getThumbnailUrl(
    asset: MediaAssetReference,
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<string>;
  getThumbnailUrls(
    assets: readonly MediaAssetReference[],
    options?: MediaUrlOptions,
    signal?: AbortSignal,
  ): Promise<Map<string, string>>;
  getSignedUploadUrl(
    videoId: string,
    paths: UploadPaths,
    signal: AbortSignal,
  ): Promise<MediaSignedUploadBundle>;
  validateUpload(file: File, assetKind: MediaAssetKind): void;
}

export type MediaProviderFactory = (
  config: MediaProviderConfig,
) => MediaProvider;

export type MediaProviderRegistry = Partial<
  Record<MediaProviderId, MediaProviderFactory>
>;
