import type { MutationFailureKind } from '../types';

function getErrorDetails(error: unknown): {
  message: string;
  status?: number;
  name?: string;
} {
  if (error instanceof Error) {
    const status =
      'status' in error && typeof error.status === 'number'
        ? error.status
        : undefined;
    return { message: error.message.toLowerCase(), status, name: error.name };
  }
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    return {
      message:
        typeof record.message === 'string' ? record.message.toLowerCase() : '',
      status: typeof record.status === 'number' ? record.status : undefined,
      name: typeof record.name === 'string' ? record.name : undefined,
    };
  }
  return { message: '' };
}

export class RetryService {
  constructor(
    private readonly maxRetries = 3,
    private readonly baseDelayMs = 500,
    private readonly maxDelayMs = 8_000,
  ) {}

  classify(error: unknown): MutationFailureKind {
    const details = getErrorDetails(error);
    if (
      details.status === 401 ||
      details.status === 403 ||
      details.message.includes('permission') ||
      details.message.includes('forbidden') ||
      details.message.includes('unauthorized')
    ) {
      return 'permission';
    }
    if (
      details.status === 409 ||
      details.status === 412 ||
      details.message.includes('conflict')
    ) {
      return 'conflict';
    }
    if (
      details.name === 'TimeoutError' ||
      details.status === 408 ||
      details.message.includes('timeout')
    ) {
      return 'timeout';
    }
    if (
      (details.status !== undefined && details.status >= 500) ||
      details.status === 429 ||
      details.message.includes('network') ||
      details.message.includes('fetch') ||
      details.message.includes('connection')
    ) {
      return 'network';
    }
    return 'unexpected';
  }

  shouldRetry(failureCount: number, error: unknown): boolean {
    if (failureCount >= this.maxRetries) {
      return false;
    }
    const kind = this.classify(error);
    return kind === 'network' || kind === 'timeout';
  }

  delay(failureCount: number): number {
    return Math.min(
      this.baseDelayMs * 2 ** Math.max(0, failureCount - 1),
      this.maxDelayMs,
    );
  }
}
