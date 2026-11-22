'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  followQueryKeys,
  getMyFollowCounts,
} from '../services/followCountService';

export function useMyFollowCounts() {
  const { isLoading, user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: userId
      ? followQueryKeys.myCounts(userId)
      : followQueryKeys.myCounts('anonymous'),
    queryFn: ({ signal }) => {
      if (!userId) {
        throw new Error('Sign in to load follow counts.');
      }
      return getMyFollowCounts(signal);
    },
    enabled: !isLoading && Boolean(userId),
    staleTime: 30_000,
  });
}
