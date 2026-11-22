'use client';

import { useActiveVideo } from '../hooks/useActiveVideo';
import { useFeed } from '../hooks/useFeed';
import { useFeedScroll } from '../hooks/useFeedScroll';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useVirtualFeed } from '../hooks/useVirtualFeed';
import { getFeedErrorMessage } from '../services/errorService';
import {
  FeedColumn,
  FeedContainer,
  FeedEmpty,
  FeedError,
  FeedHeader,
  FeedRefresh,
  FeedSkeleton,
  FeedTabs,
} from './FeedComponents';
import { FeedVirtualList } from './FeedVirtualList';

const feedKey = 'for-you';

export function HomeFeed() {
  const feed = useFeed({ feedKey });
  const activeVideo = useActiveVideo(feed.posts);
  const virtualFeed = useVirtualFeed(feed.posts);
  const pullToRefresh = usePullToRefresh(feed.refresh, feed.isRefreshing);

  useFeedScroll({
    activeItemId: activeVideo.activeId,
    ensureContentForRestore: feed.loadUntilHeight,
    feedKey,
    isReady: !feed.isLoading && (!feed.isError || feed.posts.length > 0),
  });

  return (
    <FeedContainer
      className="pb-5 touch-pan-y"
      onTouchCancel={pullToRefresh.onTouchCancel}
      onTouchEnd={pullToRefresh.onTouchEnd}
      onTouchMove={pullToRefresh.onTouchMove}
      onTouchStart={pullToRefresh.onTouchStart}
    >
      <FeedHeader />
      <FeedTabs />
      <FeedRefresh state={feed.isRefreshing ? 'refreshing' : 'idle'} />
      {pullToRefresh.pullDistance > 0 && (
        <p
          aria-live="polite"
          className="text-center text-xs font-medium text-muted"
          role="status"
          style={{ height: Math.min(pullToRefresh.pullDistance, 72) }}
        >
          {pullToRefresh.isReadyToRefresh
            ? 'Release to refresh'
            : 'Pull down to refresh'}
        </p>
      )}

      {feed.isLoading && feed.posts.length === 0 ? (
        <FeedColumn aria-label="Loading feed" aria-busy="true">
          <FeedSkeleton />
          <FeedSkeleton />
        </FeedColumn>
      ) : feed.isError && feed.posts.length === 0 ? (
        <FeedError
          description={getFeedErrorMessage(feed.error)}
          onRetry={() => {
            void feed.refresh();
          }}
          title="Your feed is temporarily unavailable"
        />
      ) : feed.isEmpty ? (
        <FeedEmpty />
      ) : (
        <FeedVirtualList
          activeId={activeVideo.activeId}
          error={feed.error}
          fetchNextPage={feed.fetchNextPage}
          hasNextPage={feed.hasNextPage}
          isFetchingNextPage={feed.isFetchingNextPage}
          listRef={virtualFeed.listRef}
          onVisibilityChange={activeVideo.onVisibilityChange}
          posts={feed.posts}
          preloadIds={activeVideo.preloadIds}
          scrollToIndex={virtualFeed.scrollToIndex}
          totalCount={feed.totalCount}
          virtualizer={virtualFeed.virtualizer}
        />
      )}
    </FeedContainer>
  );
}
