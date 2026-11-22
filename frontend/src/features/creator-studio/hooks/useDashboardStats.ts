'use client';

import type { CreatorAnalyticsRange } from '../../creator-analytics/types';
import { useCreatorAnalytics } from './useCreatorAnalytics';

export function useDashboardStats(range: CreatorAnalyticsRange = '30d') {
  const query = useCreatorAnalytics(range);
  return {
    ...query,
    stats: query.data?.totals ?? null,
    followers: query.data?.followers ?? 0,
    following: query.data?.following ?? 0,
  };
}
