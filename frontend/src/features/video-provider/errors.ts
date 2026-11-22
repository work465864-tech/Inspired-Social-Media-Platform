export type VideoProviderErrorCode =
  | 'configuration'
  | 'validation'
  | 'authentication'
  | 'network'
  | 'timeout'
  | 'rate_limit'
  | 'provider';

export class VideoProviderError extends Error {
  constructor(
    readonly status: number,
    readonly code: VideoProviderErrorCode,
    message: string,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
    this.name = 'VideoProviderError';
  }
}
