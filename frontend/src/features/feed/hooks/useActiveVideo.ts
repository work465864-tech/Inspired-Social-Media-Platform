'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { FeedPost, FeedVisibilityUpdate } from '../types/feed';
import {
  selectActiveFeedItem,
  updateFeedVisibility,
} from '../services/visibilityManager';
import { getPreloadWindow } from '../services/virtualizationManager';

export type FeedDirection = 'next' | 'previous' | 'none';

export function useActiveVideo(posts: FeedPost[], threshold = 0.45) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [direction, setDirection] = useState<FeedDirection>('none');
  const activeIdRef = useRef<string | null>(null);
  const lastActiveIndexRef = useRef<number | null>(null);
  const visibilityRef = useRef(new Map<string, number>());
  const indexById = useMemo(
    () =>
      new Map(posts.map((post, index): [string, number] => [post.id, index])),
    [posts],
  );

  const onVisibilityChange = useCallback(
    ({ id, ratio }: FeedVisibilityUpdate) => {
      updateFeedVisibility(visibilityRef.current, { id, ratio });
      const nextId = selectActiveFeedItem(visibilityRef.current, threshold);

      if (nextId === activeIdRef.current) {
        return;
      }

      const previousIndex = activeIdRef.current
        ? indexById.get(activeIdRef.current)
        : (lastActiveIndexRef.current ?? undefined);
      const nextIndex = nextId ? indexById.get(nextId) : undefined;

      if (
        previousIndex !== undefined &&
        nextIndex !== undefined &&
        previousIndex !== nextIndex
      ) {
        setDirection(nextIndex > previousIndex ? 'next' : 'previous');
      }

      if (nextIndex !== undefined) {
        lastActiveIndexRef.current = nextIndex;
      }

      activeIdRef.current = nextId;
      setActiveId(nextId);
    },
    [indexById, threshold],
  );

  const activeIndex = activeId ? (indexById.get(activeId) ?? -1) : -1;
  const previousVideoId =
    activeIndex > 0 ? (posts[activeIndex - 1]?.id ?? null) : null;
  const nextVideoId =
    activeIndex >= 0 ? (posts[activeIndex + 1]?.id ?? null) : null;
  const preloadIds = useMemo(
    () => getPreloadWindow(posts, activeIndex),
    [activeIndex, posts],
  );

  return {
    activeId,
    activeIndex,
    direction,
    nextVideoId,
    onVisibilityChange,
    preloadIds,
    previousVideoId,
  };
}
