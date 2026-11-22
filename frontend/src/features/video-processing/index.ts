export { useMetadata } from './hooks/useMetadata';
export { useFFmpeg } from './hooks/useFFmpeg';
export { useMediaProcessor } from './hooks/useMediaProcessor';
export { useProcessingQueue } from './hooks/useProcessingQueue';
export { useThumbnailGenerator } from './hooks/useThumbnailGenerator';
export { useVideoMetadata } from './hooks/useVideoMetadata';
export { useVideoProcessor } from './hooks/useVideoProcessor';
export { FFmpegService, ffmpegService } from './services/ffmpegService';
export {
  CompressionManager,
  compressionManager,
} from './services/compressionManager';
export { MetadataService, metadataService } from './services/metadataService';
export {
  normalizeProcessingError,
  VideoProcessingError,
} from './services/processingErrorService';
export {
  PreviewGenerator,
  previewGenerator,
} from './services/previewGenerator';
export {
  PublishPreparationService,
  publishPreparationService,
} from './services/publishPreparationService';
export {
  ThumbnailGenerator,
  thumbnailGenerator,
} from './services/thumbnailGenerator';
export {
  defaultVideoProcessingOptions,
  VideoProcessorService,
  videoProcessorService,
} from './services/videoProcessorService';
export type {
  GeneratedThumbnails,
  PreparedPublishPayload,
  ProcessingErrorCode,
  ProcessingProgress,
  ProcessingQueueItem,
  ProcessingStage,
  ProcessingStatus,
  VideoProcessingAdapter,
  VideoProcessingOptions,
  VideoProcessingResult,
} from './types/processing';
export type { MediaMetadata, VideoOrientation } from '../../types/media';
