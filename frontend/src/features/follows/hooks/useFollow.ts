'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedQueryKeys } from '../../feed/constants/queryKeys';
import { videoQueryKeys } from '../../video-provider/constants';
import { useAuth } from '../../auth/hooks/useAuth';
import { followQueryKeys } from '../constants/queryKeys';
import { followService } from '../services/followService';

export function useFollow(targetUserId: string) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const viewerId = user?.id;
  const isSelf = Boolean(viewerId && viewerId === targetUserId);
  const queryKey = followQueryKeys.status(
    viewerId ?? 'anonymous',
    targetUserId,
  );

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      if (!viewerId) {
        throw new Error('Sign in to view follow status.');
      }
      return followService.getStatus(targetUserId, viewerId, signal);
    },
    enabled: !isAuthLoading && Boolean(viewerId) && !isSelf,
    staleTime: 15_000,
    retry: 1,
  });

  const mutation = useMutation({
    mutationKey: ['follows', 'toggle', viewerId, targetUserId],
    mutationFn: () => {
      if (!viewerId) {
        throw new Error('Sign in to follow creators.');
      }
      return followService.toggle(targetUserId, viewerId);
    },
    onSuccess: async (status) => {
      queryClient.setQueryData(queryKey, status);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: followQueryKeys.myCounts(viewerId ?? 'anonymous'),
        }),
        queryClient.invalidateQueries({ queryKey: feedQueryKeys.all }),
        queryClient.invalidateQueries({
          queryKey: videoQueryKeys.feedPrefix,
        }),
      ]);
    },
  });

  return {
    error: query.error ?? mutation.error,
    isQueryError: query.isError,
    isLoading: isAuthLoading || query.isLoading,
    isUpdating: mutation.isPending,
    refetch: query.refetch,
    status: query.data,
    toggle: mutation.mutate,
  };
}
