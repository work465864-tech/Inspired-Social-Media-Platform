'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { shouldRetryFeedRequest } from '../../feed/services/errorService';
import { exploreQueryKeys } from '../constants/queryKeys';
import { discoveryService } from '../services/discoveryService';

export function useSuggestedAccounts() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;
  const query = useQuery({
    queryKey: exploreQueryKeys.suggestions(userId),
    queryFn: ({ signal }) =>
      userId
        ? discoveryService.getSuggestedAccounts(userId, signal)
        : Promise.resolve([]),
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: shouldRetryFeedRequest,
  });

  return { ...query, items: query.data ?? [] };
}
