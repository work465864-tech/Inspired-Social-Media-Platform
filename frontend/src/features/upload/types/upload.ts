import type { CompressionPreset, VideoFormat } from '../constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';

export type VideoMetadata = MediaMetadata;

export type VideoProbeMetadata = Pick<
  VideoMetadata,
  'durationMs' | 'width' | 'height'
>;

export type ThumbnailVariants = {
  thumbnail: File;
  poster: File;
  preview: File;
  width: number;
  height: number;
  captureTimeMs: number;
};

export type PreparedVideo = {
  original: File;
  compressed: File;
  previewClip: File;
  thumbnails: ThumbnailVariants;
  metadata: VideoMetadata;
  sourceMetadata: VideoMetadata;
  compressedDimensions: { width: number; height: number };
  preset: CompressionPreset;
  sourceFormat: VideoFormat;
};

export type VideoVisibility = 'public' | 'followers' | 'private';

export type UploadPaths = {
  original: string;
  compressed: string;
  thumbnail: string;
};

export type UploadDraft = {
  videoId: string;
  paths: UploadPaths;
};

export type SignedUpload = {
  path: string;
  signedUrl: string;
};

export type SignedAssetUploads = {
  compressed: SignedUpload;
  thumbnail: SignedUpload;
};

export type UploadedAssetMetadata = {
  bucketId: 'videos-original' | 'videos-compressed' | 'thumbnails';
  objectPath: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type UploadAssetDeclaration = Pick<
  UploadedAssetMetadata,
  'bucketId' | 'objectPath' | 'mimeType' | 'byteSize'
>;

export type UploadProgressState = {
  stage:
    | 'idle'
    | 'validating'
    | 'compressing'
    | 'uploading-original'
    | 'uploading-thumbnail'
    | 'uploading-compressed'
    | 'saving'
    | 'complete';
  percentage: number;
  bytesUploaded: number;
  bytesTotal: number;
};

export type UploadQueueStatus =
  'queued' | 'preparing' | 'uploading' | 'complete' | 'error' | 'cancelled';

export type UploadQueueItem = {
  id: string;
  file: File;
  status: UploadQueueStatus;
  percentage: number;
  error: string | null;
};
