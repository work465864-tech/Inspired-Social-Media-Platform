import { VideoProviderError } from '../errors';
import type { VideoPage, VideoPageMetadata, VideoPageRequest } from '../types';
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
    ...(entry.metadata ? { metadata: entry.metadata } : {}),
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
      console.warn(
        'Hybrid feed Supabase session lookup failed:',
        error instanceof Error ? error.message : 'Unknown session error',
      );
    }
    const cacheKey = userId ?? 'anonymous';
    const previousEntry = this.cache.get(cacheKey);
    let entry = request.page > 1 ? previousEntry : null;
    let databaseError: unknown = null;
    let databaseUnavailableSources: string[] = [];

    if (!entry) {
      let databaseVideos: FeedCacheEntry['databaseVideos'] = [];
      try {
        const result = await this.databaseProvider.getCandidates(
          userId,
          signal,
        );
        databaseVideos = result.videos;
        databaseUnavailableSources = result.unavailableSources;
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        databaseError = error;
        console.warn(
          'Hybrid feed Supabase sources failed:',
          error instanceof Error ? error.message : 'Unknown database error',
        );
      }
      entry = createCacheEntry(databaseVideos);
    }

    const end = request.page * pageSize;
    let fallbackError: unknown = null;
    const unavailableSources = new Set([
      ...(entry.metadata?.unavailableSources ?? []),
      ...databaseUnavailableSources,
    ]);
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
        for (const source of page.metadata?.unavailableSources ?? []) {
          unavailableSources.add(source);
        }
        if (page.nextPage !== null && page.nextPage <= requestedPage) {
          throw new VideoProviderError(
            503,
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
        if (page.metadata?.status === 'unavailable') {
          fallbackError = new VideoProviderError(
            503,
            'provider',
            'The fallback video source is unavailable.',
          );
          unavailableSources.add('pixabay');
          entry.fallbackExhausted = true;
          entry.nextFallbackPage = null;
          break;
        }
        entry.nextFallbackPage = page.nextPage;
        entry.fallbackExhausted = page.nextPage === null;
      } catch (error) {
        if (signal.aborted) {
          throw error;
        }
        fallbackError = error;
        entry.fallbackExhausted = true;
        entry.nextFallbackPage = null;
        unavailableSources.add('pixabay');
        console.warn(
          'Hybrid feed Pixabay source failed:',
          error instanceof VideoProviderError
            ? { code: error.code, status: error.status }
            : error instanceof Error
              ? error.message
              : 'Unknown provider error',
        );
      }
    }

    if (fallbackError) {
      const cachedPage = previousEntry
        ? getPage(previousEntry, request.page, pageSize)
        : null;
      if (cachedPage?.items.length) {
        return cachedPage;
      }
    }

    if (databaseError) {
      unavailableSources.add('supabase');
    }
    if (unavailableSources.size > 0) {
      entry.metadata = {
        status: entry.items.length > 0 ? 'partial' : 'unavailable',
        unavailableSources: [...unavailableSources],
      };
    } else {
      entry.metadata = {
        status: 'complete',
        unavailableSources: [],
      } satisfies VideoPageMetadata;
    }

    this.cache.set(cacheKey, entry);
    return getPage(entry, request.page, pageSize);
  }
}

export const feedResolver = new FeedResolver(
  databaseVideoProvider,
  fallbackVideoProvider,
);
