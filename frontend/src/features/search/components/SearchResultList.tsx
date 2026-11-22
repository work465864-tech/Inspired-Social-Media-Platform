'use client';

import { useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SearchResult, SearchTab } from '../types';
import { HashtagResultCard } from './HashtagResultCard';
import { UserResultCard } from './UserResultCard';
import { VideoResultCard } from './VideoResultCard';

type SearchResultListProps = {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  items: SearchResult[];
  tab: SearchTab;
};

function SearchResultCard({ result }: { result: SearchResult }) {
  switch (result.kind) {
    case 'user':
      return <UserResultCard user={result.user} />;
    case 'video':
      return <VideoResultCard video={result.video} />;
    case 'hashtag':
      return <HashtagResultCard hashtag={result.hashtag} />;
  }
}

export function SearchResultList({
  fetchNextPage,
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  items,
  tab,
}: SearchResultListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => (tab === 'videos' ? 150 : 100),
    overscan: 5,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const lastVisibleIndex = virtualItems.at(-1)?.index ?? -1;

  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      lastVisibleIndex >= items.length - 5
    ) {
      fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    items.length,
    lastVisibleIndex,
  ]);

  return (
    <div>
      <div
        aria-label="Search results"
        className="h-[60vh] min-h-72 max-h-[48rem] overflow-auto overscroll-contain"
        ref={scrollRef}
        role="list"
        tabIndex={0}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
            width: '100%',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const result = items[virtualItem.index];
            if (!result) {
              return null;
            }
            return (
              <div
                aria-posinset={virtualItem.index + 1}
                aria-setsize={hasNextPage ? -1 : items.length}
                className="pb-3"
                data-index={virtualItem.index}
                key={`${result.kind}:${virtualItem.index}:${result.kind === 'user' ? result.user.id : result.kind === 'video' ? result.video.id : result.hashtag.id}`}
                ref={virtualizer.measureElement}
                role="listitem"
                style={{
                  left: 0,
                  position: 'absolute',
                  top: 0,
                  transform: `translateY(${virtualItem.start}px)`,
                  width: '100%',
                }}
              >
                <SearchResultCard result={result} />
              </div>
            );
          })}
        </div>
      </div>
      {isFetchingNextPage && (
        <p className="py-4 text-center text-sm text-muted" role="status">
          Loading more results...
        </p>
      )}
      {isFetchNextPageError && (
        <div className="flex items-center justify-between gap-3 py-4">
          <p className="text-sm text-danger" role="alert">
            More results could not be loaded.
          </p>
          <button
            className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={fetchNextPage}
            type="button"
          >
            Retry
          </button>
        </div>
      )}
      {hasNextPage && !isFetchingNextPage && (
        <div className="flex justify-center py-3">
          <button
            className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={fetchNextPage}
            type="button"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
