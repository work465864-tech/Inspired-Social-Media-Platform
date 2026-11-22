'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { shouldRetryFeedRequest } from '../../feed/services/errorService';
import { exploreQueryKeys } from '../constants/queryKeys';
import { discoveryService } from '../services/discoveryService';

export function useTrendingHashtags() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const query = useQuery({
    queryKey: exploreQueryKeys.hashtags,
    queryFn: ({ signal }) => discoveryService.getTrendingHashtags(signal),
    enabled: isAuthenticated && !isAuthLoading,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryFeedRequest,
  });

  return { ...query, items: query.data ?? [] };
}
