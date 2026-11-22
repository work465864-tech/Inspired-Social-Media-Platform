import {
  FeedDataError,
  normalizeFeedError,
} from '../../feed/services/errorService';
import type {
  SearchErrorCode,
  SearchPageCursor,
  SearchTarget,
  VideoSearchSort,
} from '../types';

export function normalizeSearchQuery(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '')
    .replace(/[^\p{L}\p{N}_\s.-]/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export function normalizeSearchError(error: unknown): SearchError {
  if (error instanceof SearchError) {
    return error;
  }

  const feedError =
    error instanceof FeedDataError ? error : normalizeFeedError(error);
  const code: SearchErrorCode =
    feedError.code === 'aborted' ||
    feedError.code === 'offline' ||
    feedError.code === 'timeout' ||
    feedError.code === 'unauthorized' ||
    feedError.code === 'server'
      ? feedError.code
      : 'unexpected';
  return new SearchError(code, feedError.message);
}

export function getSearchErrorMessage(error: unknown): string {
  switch (normalizeSearchError(error).code) {
    case 'aborted':
      return 'The search request was cancelled.';
    case 'offline':
      return 'You appear to be offline. Check your connection and try again.';
    case 'timeout':
      return 'Search took too long. Try a shorter query or retry.';
    case 'unauthorized':
      return 'Sign in to search Connectly.';
    case 'validation':
      return 'Enter a valid search term to continue.';
    case 'server':
      return 'Search is temporarily unavailable. Please try again.';
    case 'unexpected':
      return 'Something went wrong while searching. Please try again.';
  }
}

export function isValidSearchCursor(
  target: SearchTarget,
  cursor: SearchPageCursor | null,
  sort: VideoSearchSort,
): boolean {
  if (cursor === null) {
    return true;
  }

  if (cursor.target !== target) {
    return false;
  }

  if (cursor.target === 'people') {
    return /^[\p{L}\p{N}_.-]{1,80}$/u.test(cursor.username);
  }
  if (cursor.target === 'hashtags') {
    return /^[a-z0-9_]{1,64}$/.test(cursor.slug);
  }

  const validVideoPosition =
    Number.isFinite(Date.parse(cursor.createdAt)) &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      cursor.id,
    );
  if (cursor.sort === 'popular') {
    return (
      sort === 'popular' &&
      Number.isSafeInteger(cursor.viewsCount) &&
      cursor.viewsCount >= 0 &&
      validVideoPosition
    );
  }
  return sort === 'recent' && validVideoPosition;
}

export class SearchError extends Error {
  constructor(
    readonly code: SearchErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export function shouldRetrySearch(
  failureCount: number,
  error: unknown,
): boolean {
  const { code } = normalizeSearchError(error);
  return failureCount < 2 && ['offline', 'timeout', 'server'].includes(code);
}
