'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { ExploreVideoCard } from './ExploreVideoCard';
import { ExploreEmpty } from './ExploreEmpty';
import { ExploreError } from './ExploreError';
import { ExploreSkeleton } from './ExploreSkeleton';
import type { Video } from '../../feed/types/models';

type TrendingCarouselProps = {
  items: Video[];
  isLoading: boolean;
  error?: unknown;
  onRetry?: () => void;
};

export function TrendingCarousel({
  items,
  isLoading,
  error,
  onRetry,
}: TrendingCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: -1 | 1) => {
    carouselRef.current?.scrollBy({
      left: direction * Math.max(carouselRef.current.clientWidth * 0.8, 240),
      behavior: 'smooth',
    });
  };

  return (
    <section aria-labelledby="trending-videos-title" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            The pulse right now
          </p>
          <h2
            className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground"
            id="trending-videos-title"
          >
            <Flame aria-hidden="true" className="h-5 w-5 text-primary" />
            Trending videos
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label="Scroll trending videos left"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => scroll(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Scroll trending videos right"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => scroll(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {isLoading ? (
        <ExploreSkeleton count={4} variant="carousel" />
      ) : error ? (
        <ExploreError error={error} onRetry={onRetry ?? (() => undefined)} />
      ) : items.length === 0 ? (
        <ExploreEmpty
          title="No trending videos yet"
          description="Popular new videos will appear here as people watch and enjoy them."
        />
      ) : (
        <div
          aria-label="Trending videos carousel"
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 scroll-smooth"
          ref={carouselRef}
          role="list"
          tabIndex={0}
        >
          {items.map((video, index) => (
            <div
              className="w-[min(68vw,14rem)] shrink-0 snap-start sm:w-[15rem]"
              key={video.id}
              role="listitem"
            >
              <ExploreVideoCard rank={index + 1} video={video} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
