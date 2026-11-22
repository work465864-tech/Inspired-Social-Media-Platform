'use client';

import { useQuery } from '@tanstack/react-query';
import { commentQueryKeys } from '../constants/queryKeys';
import { commentService } from '../services/commentService';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function useComment(commentId: string, enabled = true) {
  return useQuery({
    queryKey: commentQueryKeys.detail(commentId),
    queryFn: ({ signal }) => commentService.getComment(commentId, signal),
    enabled: enabled && uuidPattern.test(commentId),
    staleTime: 10_000,
    retry: 1,
  });
}
