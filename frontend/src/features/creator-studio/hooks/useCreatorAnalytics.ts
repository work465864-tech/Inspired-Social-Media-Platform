'use client';

import { useQuery } from '@tanstack/react-query';
import type { CreatorAnalyticsRange } from '../../creator-analytics/types';
import { creatorStudioClientService } from '../services/creatorStudioClientService';

export function useCreatorAnalytics(range: CreatorAnalyticsRange = '30d') {
  return useQuery({
    queryKey: ['creator-studio', 'analytics', range],
    queryFn: () => creatorStudioClientService.getSnapshot(range),
    staleTime: 60_000,
  });
}
