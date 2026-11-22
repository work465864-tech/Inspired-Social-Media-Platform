import { VideoUploadError } from '../../upload/services/uploadErrorService';
import type { ProcessingErrorCode, ProcessingStage } from '../types/processing';

export class VideoProcessingError extends Error {
  constructor(
    readonly code: ProcessingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'VideoProcessingError';
  }
}

const stageErrorCodes: Partial<Record<ProcessingStage, ProcessingErrorCode>> = {
  metadata: 'metadata_failed',
  thumbnail: 'thumbnail_failed',
  preview: 'preview_failed',
  compression: 'compression_failed',
  publish: 'publish_preparation_failed',
};

export function normalizeProcessingError(
  error: unknown,
  stage: ProcessingStage,
): VideoProcessingError {
  if (error instanceof VideoProcessingError) {
    return error;
  }

  if (error instanceof VideoUploadError) {
    if (error.code === 'cancelled') {
      return new VideoProcessingError('cancelled', error.message);
    }
    if (error.code === 'unsupported_codec') {
      return new VideoProcessingError('unsupported_codec', error.message);
    }
    if (error.code === 'memory_limit') {
      return new VideoProcessingError('memory_limit', error.message);
    }
    if (error.code === 'worker_crashed') {
      return new VideoProcessingError('worker_crashed', error.message);
    }
    if (error.code === 'thumbnail_failed') {
      return new VideoProcessingError('thumbnail_failed', error.message);
    }
    if (
      error.code === 'corrupted_file' ||
      error.code === 'unsupported_format' ||
      error.code === 'file_too_large' ||
      error.code === 'duration_exceeded' ||
      error.code === 'resolution_too_low' ||
      error.code === 'resolution_exceeded'
    ) {
      return new VideoProcessingError('invalid_media', error.message);
    }
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return new VideoProcessingError(
      'cancelled',
      'Video processing was cancelled.',
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : 'An unexpected error occurred while processing the video.';
  if (
    /memory access out of bounds|out of memory|allocation failed/i.test(message)
  ) {
    return new VideoProcessingError(
      'memory_limit',
      'This video exceeded the browser processing memory limit. Try a smaller file or a lower resolution.',
    );
  }
  if (/worker.*(crash|error|terminated)|worker was terminated/i.test(message)) {
    return new VideoProcessingError(
      'worker_crashed',
      'The video processing worker stopped unexpectedly. Retry processing.',
    );
  }
  return new VideoProcessingError(
    stageErrorCodes[stage] ?? 'unexpected',
    message,
  );
}
