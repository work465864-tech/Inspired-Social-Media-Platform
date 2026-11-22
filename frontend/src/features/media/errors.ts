export type MediaProviderErrorCode =
  | 'invalid_file'
  | 'network'
  | 'timeout'
  | 'permission'
  | 'provider_error'
  | 'upload_failed'
  | 'cancelled';

export class MediaProviderError extends Error {
  constructor(
    readonly code: MediaProviderErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'MediaProviderError';
  }
}

export class MediaConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaConfigurationError';
  }
}
