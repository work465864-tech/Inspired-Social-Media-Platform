'use client';

import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { FeedPost } from '../types/feed';
import {
  estimateFeedItemSize,
  feedVirtualizationConfig,
} from '../services/virtualizationManager';

export function useVirtualFeed(posts: FeedPost[]) {
  const listRef = useRef<HTMLDivElement>(null);
  const postsRef = useRef(posts);
  const [scrollMargin, setScrollMargin] = useState(0);
  const reduceMotion = useReducedMotion();
  postsRef.current = posts;

  const getItemKey = useCallback(
    (index: number) => postsRef.current[index]?.id ?? index,
    [],
  );

  const measureListOffset = useCallback(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }

    let offset = 0;
    let element: HTMLElement | null = list;

    while (element) {
      offset += element.offsetTop;
      element = element.offsetParent as HTMLElement | null;
    }

    setScrollMargin(offset);
  }, []);

  useEffect(() => {
    measureListOffset();
    window.addEventListener('resize', measureListOffset);
    return () => window.removeEventListener('resize', measureListOffset);
  }, [measureListOffset]);

  const estimateSize = useCallback(
    () =>
      estimateFeedItemSize(
        typeof window === 'undefined' ? 800 : window.innerHeight,
      ),
    [],
  );

  const virtualizer = useWindowVirtualizer<HTMLDivElement>({
    count: posts.length,
    estimateSize,
    getItemKey,
    gap: feedVirtualizationConfig.gap,
    overscan: feedVirtualizationConfig.overscan,
    scrollPaddingStart: feedVirtualizationConfig.scrollPaddingStart,
    scrollMargin,
  });

  const scrollToIndex = useCallback(
    (index: number) => {
      if (posts.length === 0) {
        return;
      }

      virtualizer.scrollToIndex(
        Math.min(Math.max(index, 0), posts.length - 1),
        {
          align: 'start',
          behavior: reduceMotion ? 'auto' : 'smooth',
        },
      );
    },
    [posts.length, reduceMotion, virtualizer],
  );

  const virtualItems = virtualizer.getVirtualItems();

  return {
    listRef,
    scrollMargin,
    scrollToIndex,
    totalSize: virtualizer.getTotalSize(),
    virtualItems,
    virtualizer,
  };
}
