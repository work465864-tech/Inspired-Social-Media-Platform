import { QueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { ConflictResolver } from '../../mutations/services/conflictResolver';
import { RollbackService } from '../../mutations/services/rollbackService';
import type { Video } from '../../feed/types/models';
import type { BookmarkPage } from '../types';
import { removeBookmarkedVideo } from './bookmarkService';

const video: Video = {
  id: 'f2a0aee0-7068-4af0-9c3d-8b5a68bb1f91',
  userId: '3d6046ad-4b13-44c3-8db0-4b63815009a8',
  caption: 'Saved moment',
  visibility: 'public',
  status: 'ready',
  durationMs: 1200,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  music: null,
  profile: {
    id: '3d6046ad-4b13-44c3-8db0-4b63815009a8',
    username: 'creator',
    displayName: 'Creator',
    avatarUrl: null,
    isVerified: false,
    isPrivate: false,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
  },
  assets: [],
  stats: {
    viewsCount: 2,
    likesCount: 1,
    commentsCount: 0,
    sharesCount: null,
    bookmarksCount: null,
  },
};

const page: BookmarkPage = {
  items: [
    {
      videoId: video.id,
      createdAt: '2026-01-02T00:00:00Z',
      video,
    },
  ],
  nextOffset: 24,
};

describe('bookmark cache helpers', () => {
  it('removes a video from every cached bookmark page', () => {
    const updated = removeBookmarkedVideo(
      { pages: [page, page], pageParams: [0, 24] },
      video.id,
    );

    expect(updated?.pages.map((item) => item.items)).toEqual([[], []]);
    expect(updated?.pages.map((item) => item.nextOffset)).toEqual([24, 24]);
  });

  it('rolls back a failed optimistic bookmark removal', () => {
    const queryClient = new QueryClient();
    const key = ['bookmarks', 'list', '3d6046ad-4b13-44c3-8db0-4b63815009a8'];
    const cached = { pages: [page], pageParams: [0] };
    queryClient.setQueryData(key, cached);

    const transaction = new RollbackService(
      queryClient,
      new ConflictResolver(),
    ).createTransaction();
    transaction.update<InfiniteData<BookmarkPage, number>>(
      key,
      (current) =>
        removeBookmarkedVideo(current, video.id) ?? {
          pages: [],
          pageParams: [],
        },
    );
    expect(
      queryClient.getQueryData<{ pages: BookmarkPage[] }>(key)?.pages[0]?.items,
    ).toEqual([]);

    transaction.rollback();
    expect(queryClient.getQueryData(key)).toEqual(cached);
    queryClient.clear();
  });
});
