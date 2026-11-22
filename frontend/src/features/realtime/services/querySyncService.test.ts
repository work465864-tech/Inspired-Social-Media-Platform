import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { QuerySyncService } from './querySyncService';
import type { InfiniteData } from '@tanstack/react-query';
import type { VideoPage } from '../../video-provider/types';
import { videoQueryKeys } from '../../video-provider/constants';

const videoPage: VideoPage = {
  items: [
    {
      id: 'video-1',
      title: 'Video',
      description: '',
      thumbnail: null,
      playbackUrl: 'https://example.com/video.mp4',
      duration: 1,
      width: 720,
      height: 1280,
      views: 1,
      likes: 1,
      comments: 1,
      shares: 0,
      creator: { id: 'user-1', name: 'Creator', avatarUrl: null },
      createdAt: null,
      isDemoContent: false,
      attribution: { label: 'Connectly', url: 'https://example.com/watch' },
    },
  ],
  nextPage: null,
  totalHits: 1,
};

describe('QuerySyncService', () => {
  it('applies optimistic data and rolls it back without overwriting newer data', () => {
    const queryClient = new QueryClient();
    const service = new QuerySyncService(queryClient, vi.fn());
    const queryKey = ['feed', 'videos'];
    queryClient.setQueryData(queryKey, { count: 1 });

    const rollback = service.applyOptimisticUpdate<{ count: number }>(
      queryKey,
      (current) => ({ count: (current?.count ?? 0) + 1 }),
    );
    expect(queryClient.getQueryData(queryKey)).toEqual({ count: 2 });
    rollback();
    expect(queryClient.getQueryData(queryKey)).toEqual({ count: 1 });

    const secondRollback = service.applyOptimisticUpdate<{ count: number }>(
      queryKey,
      (current) => ({ count: (current?.count ?? 0) + 1 }),
    );
    queryClient.setQueryData(queryKey, { count: 10 });
    secondRollback();
    expect(queryClient.getQueryData(queryKey)).toEqual({ count: 10 });

    queryClient.clear();
  });

  it('marks affected cached queries stale for selective background refetch', async () => {
    const queryClient = new QueryClient();
    const service = new QuerySyncService(queryClient, vi.fn());
    const queryKey = ['feed', 'videos'];
    queryClient.setQueryData(queryKey, [{ id: 'video-1' }]);

    service.invalidateForEvent('VIDEO_UPDATED');

    await vi.waitFor(() =>
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true),
    );
    queryClient.clear();
  });

  it('updates and removes videos from the actual hybrid-feed cache', () => {
    const queryClient = new QueryClient();
    const service = new QuerySyncService(queryClient, vi.fn());
    const queryKey = videoQueryKeys.feed('user-1');
    const initialData: InfiniteData<VideoPage, number> = {
      pages: [videoPage],
      pageParams: [1],
    };
    queryClient.setQueryData(queryKey, initialData);

    service.syncForEvent({
      type: 'VIDEO_UPDATED',
      payload: { videoId: 'video-1', changes: { likes_count: 7 } },
      receivedAt: 1,
    });
    expect(
      queryClient.getQueryData<InfiniteData<VideoPage, number>>(queryKey)
        ?.pages[0]?.items[0]?.likes,
    ).toBe(7);

    service.syncForEvent({
      type: 'VIDEO_DELETED',
      payload: { videoId: 'video-1' },
      receivedAt: 2,
    });
    const updatedData =
      queryClient.getQueryData<InfiniteData<VideoPage, number>>(queryKey);
    expect(updatedData?.pages[0]?.items).toEqual([]);
    expect(updatedData?.pages[0]?.totalHits).toBe(0);
    queryClient.clear();
  });

  it('invalidates the real hybrid feed when a video becomes available', async () => {
    const queryClient = new QueryClient();
    const service = new QuerySyncService(queryClient, vi.fn());
    const queryKey = videoQueryKeys.feed('user-1');
    queryClient.setQueryData(queryKey, {
      pages: [videoPage],
      pageParams: [1],
    });

    service.invalidateForEvent('VIDEO_CREATED');

    await vi.waitFor(() =>
      expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true),
    );
    queryClient.clear();
  });

  it('refreshes the feed when an updated video is not cached', async () => {
    const queryClient = new QueryClient();
    const service = new QuerySyncService(queryClient, vi.fn());
    const queryKey = videoQueryKeys.feed('user-1');
    queryClient.setQueryData(queryKey, {
      pages: [videoPage],
      pageParams: [1],
    });

    service.syncForEvent({
      type: 'VIDEO_UPDATED',
      payload: { videoId: 'new-video', changes: { likes_count: 1 } },
      receivedAt: 1,
    });

    await vi.waitFor(
      () =>
        expect(queryClient.getQueryState(queryKey)?.isInvalidated).toBe(true),
      { timeout: 1_000 },
    );
    service.dispose();
    queryClient.clear();
  });
});
