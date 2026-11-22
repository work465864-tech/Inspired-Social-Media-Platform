import type {
  CompressionPreset,
  VideoFormat,
} from '../../upload/constants/uploadConfig';
import type { MediaMetadata } from '../../../types/media';
import type { VideoValidationOptions } from '../../upload/services/validationService';

export type ProcessingStatus =
  'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export type ProcessingStage =
  | 'queued'
  | 'validating'
  | 'metadata'
  | 'thumbnail'
  | 'preview'
  | 'compression'
  | 'publish'
  | 'completed';

export type ProcessingProgress = {
  stage: ProcessingStage;
  percentage: number;
};

export type ProcessingErrorCode =
  | 'invalid_media'
  | 'unsupported_codec'
  | 'memory_limit'
  | 'worker_crashed'
  | 'thumbnail_failed'
  | 'preview_failed'
  | 'compression_failed'
  | 'metadata_failed'
  | 'publish_preparation_failed'
  | 'cancelled'
  | 'unexpected';

export type GeneratedThumbnails = {
  primary: File;
  poster: File;
  variants: readonly File[];
  width: number;
  height: number;
  captureTimeMs: number;
};

export type VideoProcessingOptions = VideoValidationOptions & {
  preset?: CompressionPreset;
  previewDurationSeconds?: number;
};

export type PreparedPublishPayload = {
  version: 1;
  metadata: MediaMetadata;
  assets: {
    original: File;
    compressedVideo: File;
    primaryThumbnail: File;
    poster: File;
    previewClip: File;
  };
};

export type VideoProcessingResult = {
  sourceFormat: VideoFormat;
  metadata: MediaMetadata;
  thumbnails: GeneratedThumbnails;
  previewClip: File;
  compressedVideo: File;
  compressedDimensions: { width: number; height: number };
  publishPayload: PreparedPublishPayload;
};

export type ProcessingQueueItem = {
  id: string;
  file: File;
  status: ProcessingStatus;
  progress: ProcessingProgress;
  result: VideoProcessingResult | null;
  error: string | null;
};

export type ProcessingProgressCallback = (progress: ProcessingProgress) => void;

export interface VideoProcessingAdapter {
  process(
    file: File,
    options: VideoProcessingOptions,
    signal: AbortSignal,
    onProgress: ProcessingProgressCallback,
  ): Promise<VideoProcessingResult>;
}
