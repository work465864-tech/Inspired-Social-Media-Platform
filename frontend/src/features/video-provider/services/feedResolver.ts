import { VideoProviderError } from '../errors';
import type { VideoPage, VideoPageRequest } from '../types';
import type { FeedProvider } from '../providers/feedProvider';
import {
  databaseVideoProvider,
  type DatabaseCandidateProvider,
} from '../providers/databaseVideoProvider';
import { fallbackVideoProvider } from '../providers/fallbackVideoProvider';
import { feedCache, type FeedCache, type FeedCacheEntry } from './feedCache';

function createCacheEntry(
  databaseVideos: FeedCacheEntry['databaseVideos'],
): FeedCacheEntry {
  return {
    databaseVideos,
    items: [...databaseVideos],
    nextFallbackPage: 1,
    fallbackExhausted: false,
    createdAt: Date.now(),
  };
}

function getPage(
  entry: FeedCacheEntry,
  page: number,
  pageSize: number,
): VideoPage {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = entry.items.slice(start, end);
  const hasNextPage =
    entry.items.length > end ||
    (entry.nextFallbackPage !== null && !entry.fallbackExhausted);

  return {
    items,
    nextPage: hasNextPage ? page + 1 : null,
    totalHits: entry.items.length,
  };
}

export class FeedResolver {
  constructor(
    private readonly databaseProvider: DatabaseCandidateProvider,
    private readonly fallbackProvider: FeedProvider,
    private readonly cache: FeedCache = feedCache,
  ) {}

  async resolve(
    request: VideoPageRequest,
    signal: AbortSignal,
  ): Promise<VideoPage> {
    const pageSize = request.pageSize;
    if (
      !Number.isSafeInteger(request.page) ||
      request.page < 1 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 30
    ) {
      throw new VideoProviderError(
        400,
        'validation',
        'The hybrid feed page request is invalid.',
      );
    }

    let userId: string | null = null;
    try {
      userId = await this.databaseProvider.getCurrentUserId(signal);
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
    }
    const cacheKey = userId ?? 'anonymous';
    const previousEntry = this.cache.get(cacheKey);
    let entry = request.page > 1 ? previousEntry : null;
    let databaseError: unknown = null;

    if (!entry) {
      let databaseVideos: FeedCacheEntry['databaseVideos'] = [];
      try {
        databaseVideos = await this.databaseProvider.getCandidates(
          userId,
          signal,
        );
      } catch (error) {
        databaseError = error;
      }
      entry = createCacheEntry(databaseVideos);
    }

    const end = request.page * pageSize;
    let fallbackError: unknown = null;
    while (
      entry.items.length < end &&
      !entry.fallbackExhausted &&
      entry.nextFallbackPage !== null
    ) {
      const requestedPage = entry.nextFallbackPage;
      try {
        const page = await this.fallbackProvider.getPage(
          {
            kind: 'feed',
            page: requestedPage,
            pageSize,
          },
          signal,
        );
        if (page.nextPage !== null && page.nextPage <= requestedPage) {
          throw new VideoProviderError(
            502,
            'provider',
            'The fallback provider returned an invalid page cursor.',
          );
        }

        const knownIds = new Set(entry.items.map((video) => video.id));
        for (const video of page.items) {
          if (!knownIds.has(video.id)) {
            knownIds.add(video.id);
            entry.items.push(video);
          }
        }
        entry.nextFallbackPage = page.nextPage;
        entry.fallbackExhausted = page.nextPage === null;
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        fallbackError = error;
        entry.fallbackExhausted = true;
      }
    }

    if (fallbackError) {
      const cachedPage = previousEntry
        ? getPage(previousEntry, request.page, pageSize)
        : null;
      if (cachedPage?.items.length) {
        return cachedPage;
      }
      if (entry.items.length === 0) {
        throw new VideoProviderError(
          503,
          'provider',
          databaseError
            ? 'The database and fallback video sources are unavailable.'
            : 'The fallback video source is temporarily unavailable.',
        );
      }
    }

    this.cache.set(cacheKey, entry);
    return getPage(entry, request.page, pageSize);
  }
}

export const feedResolver = new FeedResolver(
  databaseVideoProvider,
  fallbackVideoProvider,
);
