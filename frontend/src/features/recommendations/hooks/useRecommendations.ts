'use client';

import { useMemo } from 'react';
import { useForYouFeed } from './useForYouFeed';

export function useRecommendations(pageSize?: number) {
  const query = useForYouFeed(pageSize);
  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return { ...query, items };
}
