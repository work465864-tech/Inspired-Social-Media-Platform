import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from '@tanstack/react-query';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { exploreQueryKeys } from '../../explore/constants/queryKeys';
import { recommendationQueryKeys } from '../../recommendations/constants/queryKeys';
import { searchQueryKeys } from '../../search/constants/queryKeys';
import { followQueryKeys } from './followCountService';
import type { Json } from '../../../types/database.types';
import type { VideoPage } from '../../video-provider/types';
import { videoQueryKeys } from '../../video-provider/constants';
import type { RealtimeEvent, RealtimeEventName } from '../types/events';

const invalidationKeys: Partial<Record<RealtimeEventName, QueryKey[]>> = {
  VIDEO_CREATED: [
    feedQueryKeys.all,
    videoQueryKeys.feedPrefix,
    videoQueryKeys.trending,
    exploreQueryKeys.all,
    searchQueryKeys.all,
    recommendationQueryKeys.all,
  ],
  VIDEO_UPDATED: [feedQueryKeys.all, videoQueryKeys.feedPrefix],
  VIDEO_DELETED: [
    feedQueryKeys.all,
    videoQueryKeys.all,
    exploreQueryKeys.all,
    searchQueryKeys.all,
    recommendationQueryKeys.all,
  ],
  COMMENT_CREATED: [['comments']],
  COMMENT_UPDATED: [['comments']],
  COMMENT_DELETED: [['comments']],
  LIKE_CREATED: [feedQueryKeys.all],
  LIKE_REMOVED: [feedQueryKeys.all],
  BOOKMARK_CREATED: [['bookmarks']],
  BOOKMARK_REMOVED: [['bookmarks']],
  FOLLOW_CREATED: [
    feedQueryKeys.all,
    videoQueryKeys.feedPrefix,
    followQueryKeys.all,
    ['profile'],
    exploreQueryKeys.all,
    recommendationQueryKeys.all,
  ],
  FOLLOW_REMOVED: [
    feedQueryKeys.all,
    videoQueryKeys.feedPrefix,
    followQueryKeys.all,
    ['profile'],
    exploreQueryKeys.all,
    recommendationQueryKeys.all,
  ],
  NOTIFICATION_CREATED: [['notifications']],
  NOTIFICATION_UPDATED: [['notifications']],
  MESSAGE_RECEIVED: [['messages']],
  USER_ONLINE: [['presence']],
  USER_OFFLINE: [['presence']],
};

export class QuerySyncService {
  private readonly pendingInvalidations = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  constructor(
    private readonly queryClient: QueryClient,
    private readonly onError: (error: unknown) => void,
  ) {}

  syncForEvent(event: RealtimeEvent): void {
    if (event.type === 'VIDEO_UPDATED') {
      const update = this.updateCachedVideos(
        event.payload.videoId,
        event.payload.changes,
      );
      if (update.contentChanged) {
        this.invalidateForVideoContentChange();
      }
      if (!update.cachedVideoFound || update.contentChanged) {
        for (const queryKey of invalidationKeys.VIDEO_UPDATED ?? []) {
          this.invalidateSoon(queryKey);
        }
      }
      return;
    }

    if (event.type === 'VIDEO_DELETED') {
      this.removeCachedVideo(event.payload.videoId);
    }
    this.invalidateForEvent(event.type);
  }

  dispose(): void {
    for (const timeout of this.pendingInvalidations.values()) {
      clearTimeout(timeout);
    }
    this.pendingInvalidations.clear();
  }

  invalidateForEvent(type: RealtimeEventName): void {
    for (const queryKey of invalidationKeys[type] ?? []) {
      void this.invalidate(queryKey);
    }
  }

  async invalidate(queryKey: QueryKey): Promise<void> {
    try {
      await this.queryClient.invalidateQueries({ queryKey });
    } catch (error) {
      this.onError(error);
    }
  }

  private invalidateSoon(queryKey: QueryKey): void {
    const key = JSON.stringify(queryKey);
    if (this.pendingInvalidations.has(key)) {
      return;
    }
    this.pendingInvalidations.set(
      key,
      setTimeout(() => {
        this.pendingInvalidations.delete(key);
        void this.invalidate(queryKey);
      }, 400),
    );
  }

  applyOptimisticUpdate<T>(
    queryKey: QueryKey,
    updater: (current: T | undefined) => T,
  ): () => void {
    const previous = this.queryClient.getQueryData<T>(queryKey);
    const optimisticValue = updater(previous);
    this.queryClient.setQueryData<T>(queryKey, optimisticValue);
    const committedValue = this.queryClient.getQueryData<T>(queryKey);
    return () => {
      if (this.queryClient.getQueryData<T>(queryKey) !== committedValue) {
        return;
      }
      if (previous === undefined) {
        this.queryClient.removeQueries({ queryKey, exact: true });
      } else {
        this.queryClient.setQueryData(queryKey, previous);
      }
    };
  }

  private updateCachedVideos(
    videoId: string,
    changes: Json,
  ): { cachedVideoFound: boolean; contentChanged: boolean } {
    if (
      typeof changes !== 'object' ||
      changes === null ||
      Array.isArray(changes)
    ) {
      return { cachedVideoFound: false, contentChanged: false };
    }

    const record = changes as Record<string, Json>;
    const result = {
      cachedVideoFound: false,
      contentChanged: typeof record.visibility === 'string',
    };
    this.queryClient.setQueriesData<InfiniteData<VideoPage, number>>(
      { queryKey: videoQueryKeys.all },
      (current) => {
        if (!current) {
          return current;
        }
        let changed = false;
        const pages = current.pages.map((page) => ({
          ...page,
          items: page.items.map((video) => {
            if (video.id !== videoId) {
              return video;
            }
            result.cachedVideoFound = true;
            const likes =
              typeof record.likes_count === 'number' &&
              Number.isSafeInteger(record.likes_count) &&
              record.likes_count >= 0
                ? record.likes_count
                : video.likes;
            const comments =
              typeof record.comments_count === 'number' &&
              Number.isSafeInteger(record.comments_count) &&
              record.comments_count >= 0
                ? record.comments_count
                : video.comments;
            const views =
              typeof record.views_count === 'number' &&
              Number.isSafeInteger(record.views_count) &&
              record.views_count >= 0
                ? record.views_count
                : video.views;
            const caption =
              typeof record.caption === 'string'
                ? record.caption.slice(0, 500)
                : null;
            const title =
              typeof record.title === 'string'
                ? record.title.slice(0, 160)
                : caption === null
                  ? video.title
                  : caption.trim().slice(0, 160) || video.title;
            const description =
              typeof record.description === 'string'
                ? record.description.slice(0, 500)
                : (caption ?? video.description);
            if (title !== video.title || description !== video.description) {
              result.contentChanged = true;
            }
            if (
              likes === video.likes &&
              comments === video.comments &&
              views === video.views &&
              title === video.title &&
              description === video.description
            ) {
              return video;
            }
            changed = true;
            return {
              ...video,
              likes,
              comments,
              views,
              title,
              description,
            };
          }),
        }));
        return changed ? { ...current, pages } : current;
      },
    );
    return result;
  }

  private removeCachedVideo(videoId: string): void {
    this.queryClient.setQueriesData<InfiniteData<VideoPage, number>>(
      { queryKey: videoQueryKeys.all },
      (current) => {
        if (!current) {
          return current;
        }
        const removed = current.pages.some((page) =>
          page.items.some((video) => video.id === videoId),
        );
        if (!removed) {
          return current;
        }
        const pages = current.pages.map((page) => {
          const items = page.items.filter((video) => video.id !== videoId);
          const removedFromPage = items.length !== page.items.length;
          return {
            ...page,
            items,
            totalHits: Math.max(0, page.totalHits - (removedFromPage ? 1 : 0)),
          };
        });
        return { ...current, pages };
      },
    );
  }

  private invalidateForVideoContentChange(): void {
    for (const queryKey of [
      exploreQueryKeys.all,
      searchQueryKeys.all,
      recommendationQueryKeys.all,
    ]) {
      void this.invalidate(queryKey);
    }
  }
}
