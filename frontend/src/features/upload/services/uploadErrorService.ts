export type UploadErrorCode =
  | 'unsupported_format'
  | 'file_too_large'
  | 'duration_exceeded'
  | 'resolution_too_low'
  | 'resolution_exceeded'
  | 'corrupted_file'
  | 'unsupported_codec'
  | 'thumbnail_failed'
  | 'memory_limit'
  | 'worker_crashed'
  | 'offline'
  | 'cancelled'
  | 'compression_failed'
  | 'upload_failed'
  | 'storage_error'
  | 'permission'
  | 'server'
  | 'unknown';

const retryableCodes = new Set<UploadErrorCode>([
  'offline',
  'upload_failed',
  'server',
]);

export class VideoUploadError extends Error {
  readonly code: UploadErrorCode;
  readonly retryable: boolean;

  constructor(code: UploadErrorCode, message: string) {
    super(message);
    this.name = 'VideoUploadError';
    this.code = code;
    this.retryable = retryableCodes.has(code);
  }
}

export function normalizeUploadError(error: unknown): VideoUploadError {
  if (error instanceof VideoUploadError) {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'originalResponse' in error &&
    typeof error.originalResponse === 'object' &&
    error.originalResponse !== null &&
    'getStatus' in error.originalResponse &&
    typeof error.originalResponse.getStatus === 'function'
  ) {
    const status = error.originalResponse.getStatus();
    if (status === 401 || status === 403) {
      return new VideoUploadError(
        'permission',
        'You do not have permission to upload videos.',
      );
    }
    if (status >= 500) {
      return new VideoUploadError(
        'server',
        'The upload service is temporarily unavailable.',
      );
    }
    return new VideoUploadError(
      'upload_failed',
      'Supabase Storage could not complete the resumable upload.',
    );
  }

  if (error instanceof Error) {
    if (error.name === 'VideoProcessingError') {
      return new VideoUploadError('compression_failed', error.message);
    }
    if (error.name === 'AbortError') {
      return new VideoUploadError('cancelled', 'The upload was cancelled.');
    }
    if (error.name === 'TimeoutError') {
      return new VideoUploadError('server', 'The request timed out.');
    }
    if (error instanceof TypeError) {
      return new VideoUploadError(
        'offline',
        'The network request failed. Check your connection and retry.',
      );
    }
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    if (error.status === 401 || error.status === 403) {
      return new VideoUploadError(
        'permission',
        'You do not have permission to upload videos.',
      );
    }
    if (error.status >= 500) {
      return new VideoUploadError(
        'server',
        'The upload service is temporarily unavailable.',
      );
    }
  }

  return new VideoUploadError(
    'unknown',
    'Something unexpected prevented the video upload.',
  );
}

export function getUploadErrorMessage(error: unknown): string {
  return normalizeUploadError(error).message;
}
