'use client';

import { useQuery } from '@tanstack/react-query';
import { feedQueryKeys } from '../constants/queryKeys';
import { mediaService } from '../services/mediaService';
import { shouldRetryFeedRequest } from '../services/errorService';
import { videoService } from '../services/videoService';

export type UseVideosOptions = {
  limit?: number;
  enabled?: boolean;
};

export function useVideos({
  limit = 12,
  enabled = true,
}: UseVideosOptions = {}) {
  return useQuery({
    queryKey: feedQueryKeys.videos(limit),
    queryFn: async ({ signal }) => {
      const page = await videoService.getPage(null, limit, signal);
      return mediaService.hydrateThumbnails(page.videos, signal);
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    networkMode: 'always',
    retry: shouldRetryFeedRequest,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
}
