'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import { recommendationQueryKeys } from '../constants/queryKeys';
import { recommendationEngine } from '../services/recommendationEngine';

export function useInterestProfile() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: recommendationQueryKeys.interestProfile(userId ?? 'anonymous'),
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error('Sign in to load your interest profile.');
      }
      return recommendationEngine.getInterestProfile(userId, signal);
    },
    enabled: Boolean(userId && isAuthenticated && !isAuthLoading),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
