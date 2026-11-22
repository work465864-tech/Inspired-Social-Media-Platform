export type FeedErrorCode =
  | 'aborted'
  | 'offline'
  | 'timeout'
  | 'unauthorized'
  | 'not_found'
  | 'invalid_data'
  | 'server'
  | 'unknown';

const retryableCodes = new Set<FeedErrorCode>(['offline', 'timeout', 'server']);

export class FeedDataError extends Error {
  readonly code: FeedErrorCode;
  readonly retryable: boolean;

  constructor(code: FeedErrorCode, message: string) {
    super(message);
    this.name = 'FeedDataError';
    this.code = code;
    this.retryable = retryableCodes.has(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeFeedError(error: unknown): FeedDataError {
  if (error instanceof FeedDataError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'TimeoutError') {
      return new FeedDataError('timeout', 'The feed request timed out.');
    }
    if (error.name === 'AbortError') {
      return new FeedDataError('aborted', 'The feed request was cancelled.');
    }
    if (error instanceof TypeError) {
      return new FeedDataError('offline', 'The network request failed.');
    }
  }

  if (isRecord(error)) {
    const status = typeof error.status === 'number' ? error.status : null;
    const code = typeof error.code === 'string' ? error.code : null;

    if (status === 401 || status === 403 || code === '42501') {
      return new FeedDataError(
        'unauthorized',
        'You do not have permission to access this content.',
      );
    }
    if (status === 404 || code === 'PGRST116') {
      return new FeedDataError('not_found', 'This video is not available.');
    }
    if (status !== null && status >= 500) {
      return new FeedDataError(
        'server',
        'The feed service is temporarily unavailable.',
      );
    }
  }

  return new FeedDataError('unknown', 'An unexpected feed error occurred.');
}

export function shouldRetryFeedRequest(
  failureCount: number,
  error: unknown,
): boolean {
  return failureCount < 2 && normalizeFeedError(error).retryable;
}

export function getFeedErrorMessage(error: unknown): string {
  switch (normalizeFeedError(error).code) {
    case 'aborted':
      return 'The request was cancelled. Please try again.';
    case 'offline':
      return 'You appear to be offline. Check your connection and retry.';
    case 'timeout':
      return 'The feed request timed out. Please try again.';
    case 'unauthorized':
      return 'You are not authorized to view this feed.';
    case 'not_found':
      return 'This video is no longer available.';
    case 'invalid_data':
      return 'The feed returned data in an unexpected format.';
    case 'server':
      return 'The feed is temporarily unavailable. Please try again.';
    case 'unknown':
      return 'Something went wrong while loading the feed.';
  }
}

export type TimedSignal = {
  signal: AbortSignal;
  didTimeout: () => boolean;
  dispose: () => void;
};

export function createTimedSignal(
  parent: AbortSignal,
  timeoutMs: number,
): TimedSignal {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(
      new FeedDataError('timeout', 'The feed request timed out.'),
    );
  }, timeoutMs);

  const abortFromParent = () => controller.abort(parent.reason);
  if (parent.aborted) {
    abortFromParent();
  } else {
    parent.addEventListener('abort', abortFromParent, { once: true });
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timeout);
      parent.removeEventListener('abort', abortFromParent);
    },
  };
}

export async function withTimedRequest<T>(
  parent: AbortSignal,
  timeoutMs: number,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const timed = createTimedSignal(parent, timeoutMs);

  try {
    return await request(timed.signal);
  } catch (error) {
    if (timed.didTimeout()) {
      throw new FeedDataError('timeout', 'The feed request timed out.');
    }
    throw normalizeFeedError(error);
  } finally {
    timed.dispose();
  }
}

export function withTimeout<T>(
  request: Promise<T>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      signal.removeEventListener('abort', abortRequest);
      callback();
    };
    const abortRequest = () => {
      finish(() => reject(normalizeFeedError(signal.reason)));
    };
    const timeout = setTimeout(() => {
      finish(() =>
        reject(new FeedDataError('timeout', 'The media request timed out.')),
      );
    }, timeoutMs);

    if (signal.aborted) {
      abortRequest();
      return;
    }

    signal.addEventListener('abort', abortRequest, { once: true });
    request.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(normalizeFeedError(error))),
    );
  });
}
