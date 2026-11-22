import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { videoQueryKeys } from '../constants';
import type { Video, VideoPage } from '../types';

export function updateCachedFeedVideo(
  queryClient: QueryClient,
  userId: string,
  videoId: string,
  updateVideo: (video: Video) => Video,
): void {
  queryClient.setQueryData<InfiniteData<VideoPage, number>>(
    videoQueryKeys.feed(userId),
    (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          items: page.items.map((video) =>
            video.id === videoId ? updateVideo(video) : video,
          ),
        })),
      };
    },
  );
}
