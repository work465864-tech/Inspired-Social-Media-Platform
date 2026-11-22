'use client';

import { useEffect, useMemo, useState } from 'react';
import { minimumVideoSearchLength } from '../constants';
import { VideoProviderError } from '../errors';
import { useSearchVideos } from '../hooks/useSearchVideos';
import {
  useTrendingVideos,
  usePrefetchTrendingVideos,
} from '../hooks/useTrendingVideos';
import { useVideoFeed } from '../hooks/useVideoFeed';
import { FeedContainer } from './FeedContainer';
import { VideoFeedEmpty, VideoFeedError } from './VideoFeedStates';
import { VideoLoader } from './VideoLoader';

type FeedMode = 'feed' | 'trending';

function getErrorMessage(error: unknown): string {
  if (error instanceof VideoProviderError) {
    return error.message;
  }
  return 'Check your connection and try again.';
}

export function VideoFeedPage() {
  const [mode, setMode] = useState<FeedMode>('feed');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const prefetchTrending = usePrefetchTrendingVideos();
  const feedQuery = useVideoFeed(mode === 'feed' && !searchQuery);
  const trendingQuery = useTrendingVideos(mode === 'trending' && !searchQuery);
  const searchResults = useSearchVideos(searchQuery);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearchQuery(searchInput.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const activeQuery = searchQuery
    ? searchResults
    : mode === 'trending'
      ? trendingQuery
      : feedQuery;
  const videos = useMemo(
    () => activeQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [activeQuery.data],
  );

  return (
    <section className="mx-auto w-full max-w-2xl space-y-3 pb-3">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Discover in motion
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Videos
          </h1>
        </div>
        <label className="sr-only" htmlFor="video-search">
          Search videos
        </label>
        <input
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary sm:max-w-xs"
          id="video-search"
          maxLength={100}
          onChange={(event) => setSearchInput(event.currentTarget.value)}
          placeholder="Search videos"
          type="search"
          value={searchInput}
        />
      </header>

      {!searchQuery && (
        <nav aria-label="Video feed" className="flex gap-2">
          <button
            aria-pressed={mode === 'feed'}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'feed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
            onClick={() => setMode('feed')}
            type="button"
          >
            For you
          </button>
          <button
            aria-pressed={mode === 'trending'}
            className={`min-h-10 rounded-full px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              mode === 'trending'
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-muted hover:text-foreground'
            }`}
            onFocus={() => void prefetchTrending()}
            onMouseEnter={() => void prefetchTrending()}
            onClick={() => setMode('trending')}
            type="button"
          >
            Trending
          </button>
        </nav>
      )}

      {searchInput.trim().length > 0 &&
        searchInput.trim().length < minimumVideoSearchLength && (
          <p className="text-xs text-muted" role="status">
            Enter at least {minimumVideoSearchLength} characters to search.
          </p>
        )}

      {activeQuery.isLoading ? (
        <VideoLoader label="Loading your video feed" />
      ) : activeQuery.isError && videos.length === 0 ? (
        <VideoFeedError
          message={getErrorMessage(activeQuery.error)}
          onRetry={() => {
            void activeQuery.refetch();
          }}
        />
      ) : videos.length === 0 ? (
        <VideoFeedEmpty
          searching={searchQuery.length >= minimumVideoSearchLength}
        />
      ) : (
        <FeedContainer
          key={searchQuery ? `search:${searchQuery}` : mode}
          hasNextPage={activeQuery.hasNextPage ?? false}
          isFetchingNextPage={activeQuery.isFetchingNextPage}
          onFetchNextPage={() => {
            if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
              void activeQuery.fetchNextPage();
            }
          }}
          videos={videos}
        />
      )}
    </section>
  );
}
