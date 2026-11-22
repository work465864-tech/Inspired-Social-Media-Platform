'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { recommendationQueryKeys } from '../constants/queryKeys';
import { recommendationService } from '../services/recommendationService';

export function useRecommendationScore(videoId: string | null) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: recommendationQueryKeys.score(
      userId ?? 'anonymous',
      videoId ?? 'none',
    ),
    queryFn: ({ signal }) => {
      if (!userId || !videoId) {
        throw new Error('A signed-in user and video are required for scoring.');
      }
      return recommendationService.getScore(userId, videoId, signal);
    },
    enabled: Boolean(userId && videoId && isAuthenticated && !isAuthLoading),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
