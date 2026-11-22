'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Video } from '../../feed/types/models';
import { ExploreEmpty } from './ExploreEmpty';
import { ExploreError } from './ExploreError';
import { ExploreSkeleton } from './ExploreSkeleton';
import { ExploreVideoCard } from './ExploreVideoCard';

type TrendingGridProps = {
  title: string;
  labelledBy: string;
  items: Video[];
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
};

function getColumnCount(): number {
  if (typeof window === 'undefined') {
    return 2;
  }
  if (window.innerWidth >= 1280) {
    return 4;
  }
  if (window.innerWidth >= 768) {
    return 3;
  }
  return 2;
}

export function TrendingGrid({
  title,
  labelledBy,
  items,
  isLoading,
  error,
  onRetry,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: TrendingGridProps) {
  const [columns, setColumns] = useState(2);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => {
    const result: Video[][] = [];
    for (let index = 0; index < items.length; index += columns) {
      result.push(items.slice(index, index + columns));
    }
    return result;
  }, [columns, items]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () =>
      typeof window === 'undefined'
        ? 340
        : Math.min(Math.max(window.innerWidth / columns, 280), 420),
    overscan: 3,
  });
  const virtualRows = virtualizer.getVirtualItems();
  const lastVisibleRow = virtualRows.at(-1)?.index ?? -1;

  useEffect(() => {
    const updateColumns = () => setColumns(getColumnCount());
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      onLoadMore?.();
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore]);

  useEffect(() => {
    if (lastVisibleRow >= rows.length - 2 && rows.length > 0) {
      loadMore();
    }
  }, [lastVisibleRow, loadMore, rows.length]);

  return (
    <section aria-labelledby={labelledBy} className="space-y-4">
      <h2 className="text-xl font-bold text-foreground" id={labelledBy}>
        {title}
      </h2>
      {isLoading && items.length === 0 ? (
        <ExploreSkeleton count={8} />
      ) : error && items.length === 0 ? (
        <ExploreError error={error} onRetry={onRetry ?? (() => undefined)} />
      ) : items.length === 0 ? (
        <ExploreEmpty />
      ) : (
        <>
          <div
            aria-label={title}
            aria-busy={isFetchingNextPage}
            className="h-[min(70vh,52rem)] min-h-[24rem] overflow-auto overscroll-contain"
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
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index] ?? [];
                return (
                  <div
                    className="absolute left-0 grid w-full gap-3 pb-3"
                    data-index={virtualRow.index}
                    key={virtualRow.key}
                    ref={virtualizer.measureElement}
                    role="presentation"
                    style={{
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.map((video) => (
                      <div key={video.id} role="listitem">
                        <ExploreVideoCard video={video} />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {isFetchingNextPage && (
            <p className="py-2 text-center text-sm text-muted" role="status">
              Loading more videos...
            </p>
          )}
          {error && items.length > 0 && (
            <p className="text-center text-sm text-danger" role="alert">
              Some videos could not be refreshed.
            </p>
          )}
          {hasNextPage && (
            <div className="flex justify-center">
              <button
                className="min-h-10 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                disabled={isFetchingNextPage}
                onClick={loadMore}
                type="button"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
