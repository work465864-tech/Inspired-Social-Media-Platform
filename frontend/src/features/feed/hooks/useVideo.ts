'use client';

import { useQuery } from '@tanstack/react-query';
import { feedQueryKeys } from '../constants/queryKeys';
import { FeedDataError } from '../services/errorService';
import { mediaService } from '../services/mediaService';
import { shouldRetryFeedRequest } from '../services/errorService';
import { videoService } from '../services/videoService';

export function useVideo(videoId: string | null | undefined) {
  const enabled = typeof videoId === 'string' && videoId.length > 0;

  return useQuery({
    queryKey: feedQueryKeys.video(videoId ?? ''),
    queryFn: async ({ signal }) => {
      const video = await videoService.getById(videoId ?? '', signal);
      const [hydratedVideo] = await mediaService.hydrateThumbnails(
        [video],
        signal,
      );
      if (!hydratedVideo) {
        throw new FeedDataError(
          'invalid_data',
          'The video thumbnail response was incomplete.',
        );
      }
      return hydratedVideo;
    },
    enabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: 'always',
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
}
