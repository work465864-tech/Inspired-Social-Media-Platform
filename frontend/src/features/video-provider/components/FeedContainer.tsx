'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Video } from '../types';
import { GestureHandler } from './GestureHandler';
import { VideoCard } from './VideoCard';
import { VideoLoader } from './VideoLoader';

type FeedContainerProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  videos: Video[];
};

export function FeedContainer({
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  videos,
}: FeedContainerProps) {
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibility = useRef(new Map<string, number>());
  const previousVideoIds = useRef<string[]>([]);
  const scrollAnchors = useRef(new Map<string, number>());
  const virtualizer = useVirtualizer({
    count: videos.length + (hasNextPage ? 1 : 0),
    getScrollElement: () => scrollRoot,
    estimateSize: () => scrollRoot?.clientHeight || 560,
    getItemKey: (index) => videos[index]?.id ?? `loading-${index}`,
    overscan: 2,
  });

  const onVisibilityChange = useCallback((id: string, ratio: number) => {
    if (ratio <= 0) {
      visibility.current.delete(id);
    } else {
      visibility.current.set(id, ratio);
    }

    let candidateId: string | null = null;
    let candidateRatio = 0.5;
    for (const [videoId, visibleRatio] of visibility.current) {
      if (visibleRatio >= candidateRatio) {
        candidateId = videoId;
        candidateRatio = visibleRatio;
      }
    }
    setActiveId(candidateId);
  }, []);

  useEffect(() => {
    if (!scrollRoot) {
      return;
    }
    const resizeObserver = new ResizeObserver(() => virtualizer.measure());
    resizeObserver.observe(scrollRoot);
    return () => resizeObserver.disconnect();
  }, [scrollRoot, virtualizer]);

  useEffect(() => {
    if (!scrollRoot || !sentinel || !hasNextPage) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !isFetchingNextPage
        ) {
          onFetchNextPage();
        }
      },
      { root: scrollRoot, rootMargin: '700px 0px', threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, onFetchNextPage, scrollRoot, sentinel]);

  const activeIndex = useMemo(
    () => videos.findIndex((video) => video.id === activeId),
    [activeId, videos],
  );
  const navigate = useCallback(
    (direction: 'next' | 'previous') => {
      const currentIndex = activeIndex < 0 ? 0 : activeIndex;
      const nextIndex =
        direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      if (nextIndex < 0) {
        return;
      }
      if (nextIndex >= videos.length) {
        if (hasNextPage && !isFetchingNextPage) {
          onFetchNextPage();
        }
        return;
      }
      virtualizer.scrollToIndex(nextIndex, {
        align: 'start',
        behavior: 'smooth',
      });
    },
    [
      activeIndex,
      hasNextPage,
      isFetchingNextPage,
      onFetchNextPage,
      videos.length,
      virtualizer,
    ],
  );

  const virtualItems = virtualizer.getVirtualItems();

  const captureScrollAnchors = useCallback(() => {
    if (!scrollRoot) {
      return;
    }
    const rootBounds = scrollRoot.getBoundingClientRect();
    const nextAnchors = new Map<string, number>();
    for (const element of scrollRoot.querySelectorAll<HTMLElement>(
      '[data-video-id]',
    )) {
      const bounds = element.getBoundingClientRect();
      if (bounds.bottom > rootBounds.top && bounds.top < rootBounds.bottom) {
        const id = element.dataset.videoId;
        if (id) {
          nextAnchors.set(id, bounds.top - rootBounds.top);
        }
      }
    }
    scrollAnchors.current = nextAnchors;
  }, [scrollRoot]);

  useEffect(() => {
    if (!scrollRoot) {
      return;
    }
    scrollRoot.addEventListener('scroll', captureScrollAnchors, {
      passive: true,
    });
    captureScrollAnchors();
    return () => scrollRoot.removeEventListener('scroll', captureScrollAnchors);
  }, [captureScrollAnchors, scrollRoot]);

  useLayoutEffect(() => {
    const nextIds = videos.map((video) => video.id);
    const previousIds = previousVideoIds.current;
    const orderChanged =
      previousIds.length !== nextIds.length ||
      previousIds.some((id, index) => id !== nextIds[index]);
    if (scrollRoot && orderChanged && scrollAnchors.current.size > 0) {
      const nextIdSet = new Set(nextIds);
      const anchor = [...scrollAnchors.current.entries()]
        .filter(([id]) => nextIdSet.has(id))
        .sort((left, right) => Math.abs(left[1]) - Math.abs(right[1]))[0];
      if (anchor) {
        const element = [
          ...scrollRoot.querySelectorAll<HTMLElement>('[data-video-id]'),
        ].find((item) => item.dataset.videoId === anchor[0]);
        if (element) {
          const rootTop = scrollRoot.getBoundingClientRect().top;
          const currentOffset = element.getBoundingClientRect().top - rootTop;
          scrollRoot.scrollTop += currentOffset - anchor[1];
        }
      }
    }
    previousVideoIds.current = nextIds;
    captureScrollAnchors();
  }, [captureScrollAnchors, scrollRoot, videos]);

  return (
    <GestureHandler
      className="h-[calc(100svh-14rem)] min-h-[25rem] touch-pan-x overflow-y-auto overscroll-contain rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-[min(76svh,54rem)]"
      onNext={() => navigate('next')}
      onPrevious={() => navigate('previous')}
      ref={setScrollRoot}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((item) => {
          const video = videos[item.index];
          if (!video) {
            return (
              <div
                className="absolute left-0 top-0 w-full"
                key={item.key}
                ref={setSentinel}
                style={{
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                {isFetchingNextPage && (
                  <VideoLoader compact label="Loading more videos" />
                )}
              </div>
            );
          }

          return (
            <div
              className="absolute left-0 top-0 w-full pb-2"
              data-index={item.index}
              data-video-id={video.id}
              key={item.key}
              ref={virtualizer.measureElement}
              style={{
                height: `${item.size}px`,
                transform: `translateY(${item.start}px)`,
              }}
            >
              <VideoCard
                active={activeId === video.id}
                index={item.index}
                onVisibilityChange={onVisibilityChange}
                preloadNext={item.index === activeIndex + 1}
                root={scrollRoot}
                video={video}
              />
            </div>
          );
        })}
      </div>
      {videos.length > 0 && (
        <p aria-live="polite" className="sr-only">
          Showing {videos.length} videos. More videos load as you scroll.
          {!hasNextPage ? ' You have reached the end.' : ''}
        </p>
      )}
    </GestureHandler>
  );
}
