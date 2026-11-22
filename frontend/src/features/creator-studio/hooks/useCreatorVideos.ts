'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatorContentFilters, CreatorVideoEditorInput } from '../types';
import { creatorStudioClientService } from '../services/creatorStudioClientService';

export function useCreatorVideos(
  filters: CreatorContentFilters,
  enabled = true,
) {
  return useQuery({
    queryKey: ['creator-studio', 'videos', filters],
    queryFn: () => creatorStudioClientService.getVideos(filters),
    staleTime: 30_000,
    enabled,
  });
}

export function useUpdateCreatorVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      videoId,
      input,
    }: {
      videoId: string;
      input: CreatorVideoEditorInput;
    }) => creatorStudioClientService.updateVideo(videoId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['creator-studio', 'videos'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['creator-studio', 'analytics'],
      });
    },
  });
}

export function useDeleteCreatorVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) =>
      creatorStudioClientService.deleteVideo(videoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['creator-studio', 'videos'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['creator-studio', 'analytics'],
      });
    },
  });
}
