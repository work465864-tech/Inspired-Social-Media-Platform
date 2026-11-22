'use client';

import { memo, useCallback, useEffect, useId } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import { useFeedVisibility } from '../hooks/useFeedVisibility';
import type { FeedPost, FeedVisibilityUpdate } from '../types/feed';
import { FeedError, FeedItem, FeedSkeleton } from './FeedComponents';

type FeedVirtualListProps = {
  activeId: string | null;
  error: Error | null;
  fetchNextPage: () => Promise<unknown>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  onVisibilityChange: (update: FeedVisibilityUpdate) => void;
  posts: FeedPost[];
  preloadIds: string[];
  scrollToIndex: (index: number) => void;
  totalCount: number;
  virtualizer: Virtualizer<Window, HTMLDivElement>;
};

const VirtualFeedItem = memo(function VirtualFeedItem({
  active,
  index,
  onVisibilityChange,
  post,
  preload,
  totalCount,
  virtualStart,
  virtualizer,
}: {
  active: boolean;
  index: number;
  onVisibilityChange: (update: FeedVisibilityUpdate) => void;
  post: FeedPost;
  preload: boolean;
  totalCount: number;
  virtualStart: number;
  virtualizer: Virtualizer<Window, HTMLDivElement>;
}) {
  const visibility = useFeedVisibility({
    id: post.id,
    onVisibilityChange,
  });
  const visibilityRef = visibility.ref;
  const setItemRef = useCallback(
    (element: HTMLDivElement | null) => {
      virtualizer.measureElement(element);
      visibilityRef(element);
    },
    [virtualizer, visibilityRef],
  );

  return (
    <div
      aria-label={`Video ${index + 1} by ${post.displayName}`}
      aria-posinset={index + 1}
      aria-setsize={totalCount || -1}
      className="absolute left-0 top-0 w-full"
      data-active-video={active}
      data-index={index}
      data-preload={preload}
      ref={setItemRef}
      role="article"
      style={{
        transform: `translateY(${virtualStart - virtualizer.options.scrollMargin}px)`,
      }}
    >
      <FeedItem index={index} post={post} />
    </div>
  );
});

export const FeedVirtualList = memo(function FeedVirtualList({
  activeId,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  listRef,
  onVisibilityChange,
  posts,
  preloadIds,
  scrollToIndex,
  totalCount,
  virtualizer,
}: FeedVirtualListProps) {
  const keyboardHelpId = useId();
  const noVisibilityChange = useCallback(() => {}, []);
  const sentinel = useFeedVisibility({
    enabled: hasNextPage && !error,
    id: 'feed-pagination-sentinel',
    onVisibilityChange: noVisibilityChange,
    rootMargin: '1000px 0px',
    threshold: 0,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const preloadedIds = new Set(preloadIds);
  const activeIndex = activeId
    ? posts.findIndex((post) => post.id === activeId)
    : -1;
  const isNearLoadedEnd = activeIndex >= Math.max(0, posts.length - 3);

  useEffect(() => {
    if (
      sentinel.isVisible &&
      isNearLoadedEnd &&
      hasNextPage &&
      !isFetchingNextPage &&
      !error
    ) {
      void fetchNextPage();
    }
  }, [
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isNearLoadedEnd,
    sentinel.isVisible,
  ]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest('a, button, input, select, textarea, [role="slider"]'))
      ) {
        return;
      }

      const foundIndex =
        activeId === null
          ? (virtualItems[0]?.index ?? 0)
          : posts.findIndex((post) => post.id === activeId);
      const currentIndex = foundIndex >= 0 ? foundIndex : 0;

      let nextIndex: number | null = null;
      switch (event.key) {
        case 'ArrowDown':
        case 'PageDown':
          nextIndex = currentIndex + 1;
          break;
        case 'ArrowUp':
        case 'PageUp':
          nextIndex = currentIndex - 1;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = posts.length - 1;
          break;
      }

      if (nextIndex !== null && posts.length > 0) {
        event.preventDefault();
        scrollToIndex(nextIndex);
      }
    },
    [activeId, posts, scrollToIndex, virtualItems],
  );

  return (
    <div className="space-y-5">
      <div
        aria-busy={isFetchingNextPage}
        aria-describedby={keyboardHelpId}
        aria-label="Video feed"
        className="relative min-w-0 outline-none focus-visible:rounded-2xl focus-visible:ring-2 focus-visible:ring-primary"
        onKeyDown={handleKeyDown}
        ref={listRef}
        role="feed"
        style={{ height: virtualizer.getTotalSize() + 1 }}
        tabIndex={0}
      >
        {virtualItems.map((virtualItem) => {
          const post = posts[virtualItem.index];
          if (!post) {
            return null;
          }

          return (
            <VirtualFeedItem
              active={post.id === activeId}
              index={virtualItem.index}
              key={post.id}
              onVisibilityChange={onVisibilityChange}
              post={post}
              preload={preloadedIds.has(post.id)}
              totalCount={totalCount}
              virtualStart={virtualItem.start}
              virtualizer={virtualizer}
            />
          );
        })}
        <div
          aria-hidden="true"
          className="absolute left-0 top-0 h-px w-full"
          ref={sentinel.ref}
          style={{
            transform: `translateY(${virtualizer.getTotalSize()}px)`,
          }}
        />
      </div>
      <p className="sr-only" id={keyboardHelpId}>
        Use the up and down arrow keys to move between videos. Home and End go
        to the first and last loaded videos.
      </p>
      {isFetchingNextPage && (
        <div aria-live="polite" className="pt-6">
          <FeedSkeleton />
          <span className="sr-only">Loading more videos</span>
        </div>
      )}
      {error && posts.length > 0 && (
        <FeedError
          description="The next batch of videos could not be loaded."
          onRetry={() => {
            void fetchNextPage();
          }}
          title="More videos are temporarily unavailable"
        />
      )}
      {!hasNextPage && !error && (
        <p
          aria-live="polite"
          className="py-8 text-center text-sm text-muted"
          role="status"
        >
          You’re all caught up.
        </p>
      )}
    </div>
  );
});
