import { feedPreviewPosts } from '../data/feedPreview';
import type { FeedPage, FeedPageRequest } from '../types/feed';

const mockPageDelay = 90;

function waitForMockPage(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, mockPageDelay);

    function handleAbort() {
      clearTimeout(timer);
      const abortError = new Error('The mock feed request was cancelled.');
      abortError.name = 'AbortError';
      reject(signal.reason ?? abortError);
    }

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export function createFeedManager(totalCount = 5000) {
  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new RangeError('Feed total count must be a non-negative integer.');
  }

  return {
    totalCount,

    async getPage({
      cursor,
      limit,
      signal,
    }: FeedPageRequest): Promise<FeedPage> {
      if (!Number.isInteger(cursor) || cursor < 0) {
        throw new RangeError('Feed cursor must be a non-negative integer.');
      }

      if (!Number.isInteger(limit) || limit < 1) {
        throw new RangeError('Feed page size must be a positive integer.');
      }

      await waitForMockPage(signal);

      const end = Math.min(cursor + limit, totalCount);
      const posts = Array.from(
        { length: Math.max(0, end - cursor) },
        (_, offset) => {
          const index = cursor + offset;
          const template = feedPreviewPosts[index % feedPreviewPosts.length];

          return {
            ...template,
            id: `mock-${index}-${template.id}`,
          };
        },
      );

      return {
        posts,
        nextCursor: end < totalCount ? end : undefined,
        totalCount,
      };
    },
  };
}

export const feedManager = createFeedManager();
