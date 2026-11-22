import { VideoProviderError } from '../errors';

export function shouldRetryVideoRequest(
  failureCount: number,
  error: Error,
): boolean {
  if (
    error instanceof VideoProviderError &&
    (error.status === 400 ||
      error.status === 401 ||
      error.status === 403 ||
      error.status === 429)
  ) {
    return false;
  }
  return failureCount < 2;
}

export function getVideoRetryDelay(attempt: number, error: Error): number {
  const retryAfterSeconds =
    error instanceof VideoProviderError ? error.retryAfterSeconds : null;
  return retryAfterSeconds
    ? Math.min(retryAfterSeconds * 1_000, 60_000)
    : Math.min(1_000 * 2 ** attempt, 8_000);
}
