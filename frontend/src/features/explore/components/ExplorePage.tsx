'use client';

import { useCallback, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Compass, Flame, Hash, UsersRound, Video } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { exploreQueryKeys } from '../constants/queryKeys';
import { exploreCategories } from '../constants';
import { discoveryService } from '../services/discoveryService';
import type { ExploreCategorySlug } from '../types';
import { useExplore } from '../hooks/useExplore';
import { useSuggestedAccounts } from '../hooks/useSuggestedAccounts';
import { useTrendingCreators } from '../hooks/useTrendingCreators';
import { useTrendingHashtags } from '../hooks/useTrendingHashtags';
import { CategorySection } from './CategorySection';
import { CreatorCard } from './CreatorCard';
import { ExploreEmpty } from './ExploreEmpty';
import { ExploreError } from './ExploreError';
import { ExploreSkeleton } from './ExploreSkeleton';
import { HashtagCard } from './HashtagCard';
import { TrendingCarousel } from './TrendingCarousel';
import { TrendingGrid } from './TrendingGrid';

function ExploreSection({
  children,
  icon: Icon,
  title,
  id,
}: {
  children: React.ReactNode;
  icon: typeof Flame;
  title: string;
  id: string;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Discover together
        </p>
        <h2
          className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground"
          id={id}
        >
          <Icon aria-hidden="true" className="h-5 w-5 text-primary" />
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export function ExplorePage() {
  const [category, setCategory] = useState<ExploreCategorySlug>('all');
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const explore = useExplore(category);
  const creators = useTrendingCreators();
  const hashtags = useTrendingHashtags();
  const suggestions = useSuggestedAccounts();
  const selectedCategory =
    exploreCategories.find((item) => item.slug === category)?.label ??
    'For you';

  const prefetchCategory = useCallback(
    (nextCategory: ExploreCategorySlug) => {
      if (nextCategory === category) {
        return;
      }
      void queryClient.prefetchQuery({
        queryKey: exploreQueryKeys.videos(nextCategory, 'trending'),
        queryFn: ({ signal }) =>
          discoveryService.getTrendingVideos(nextCategory, signal),
        staleTime: 60_000,
      });
    },
    [category, queryClient],
  );

  const retryVideos = useCallback(() => {
    void explore.trendingVideosQuery.refetch();
  }, [explore.trendingVideosQuery]);

  return (
    <motion.div
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="mx-auto max-w-7xl space-y-9 pb-8"
      initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: reduceMotion ? 0 : 0.24 }}
    >
      <header className="relative overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-primary/15 via-surface to-accent/10 p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Compass aria-hidden="true" className="h-4 w-4" />A little
              inspiration
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Explore Connectly
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              Fresh videos, voices, and ideas from across the community.
              Discover what is resonating today.
            </p>
          </div>
          <p className="rounded-full border border-border bg-surface/75 px-4 py-2 text-xs font-semibold text-muted">
            Exploring:{' '}
            <span className="text-foreground">{selectedCategory}</span>
          </p>
        </div>
      </header>

      <TrendingCarousel
        error={explore.trendingVideosQuery.error}
        isLoading={explore.trendingVideosQuery.isLoading}
        items={explore.trendingVideos}
        onRetry={retryVideos}
      />

      <CategorySection
        onChange={setCategory}
        onPrefetch={prefetchCategory}
        value={category}
      />

      <TrendingGrid
        error={explore.popularThisWeekQuery.error}
        isLoading={explore.popularThisWeekQuery.isLoading}
        items={explore.popularThisWeek}
        labelledBy="popular-this-week-title"
        onRetry={() => void explore.popularThisWeekQuery.refetch()}
        title="Popular this week"
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <ExploreSection
          icon={UsersRound}
          id="trending-creators-title"
          title="Trending creators"
        >
          {creators.isLoading ? (
            <ExploreSkeleton count={3} variant="cards" />
          ) : creators.isError ? (
            <ExploreError
              error={creators.error}
              onRetry={() => void creators.refetch()}
            />
          ) : creators.items.length === 0 ? (
            <ExploreEmpty
              title="Creators are on their way"
              description="Creators with fresh videos will show up here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {creators.items.map((creator) => (
                <CreatorCard
                  key={creator.profile.id}
                  profile={creator.profile}
                  videosCount={creator.videosCount}
                  viewsCount={creator.viewsCount}
                />
              ))}
            </div>
          )}
        </ExploreSection>

        <ExploreSection
          icon={Hash}
          id="trending-hashtags-title"
          title="Trending hashtags"
        >
          {hashtags.isLoading ? (
            <ExploreSkeleton count={3} variant="cards" />
          ) : hashtags.isError ? (
            <ExploreError
              error={hashtags.error}
              onRetry={() => void hashtags.refetch()}
            />
          ) : hashtags.items.length === 0 ? (
            <ExploreEmpty
              title="No trending hashtags"
              description="Hashtags on recent videos will appear here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {hashtags.items.slice(0, 6).map((hashtag) => (
                <HashtagCard hashtag={hashtag} key={hashtag.id} />
              ))}
            </div>
          )}
        </ExploreSection>
      </div>

      <ExploreSection
        icon={UsersRound}
        id="suggested-accounts-title"
        title="Suggested accounts"
      >
        {suggestions.isLoading ? (
          <ExploreSkeleton count={4} variant="cards" />
        ) : suggestions.isError ? (
          <ExploreError
            error={suggestions.error}
            onRetry={() => void suggestions.refetch()}
          />
        ) : suggestions.items.length === 0 ? (
          <ExploreEmpty
            title="No new accounts to suggest"
            description="New public creators will appear here."
          />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 xl:grid-cols-4">
            {suggestions.items.map((profile) => (
              <CreatorCard
                key={profile.id}
                label="Suggested creator"
                profile={profile}
              />
            ))}
          </div>
        )}
      </ExploreSection>

      <ExploreSection
        icon={Video}
        id="recently-uploaded-title"
        title="Recently uploaded"
      >
        {explore.recent.isError && explore.recentItems.length === 0 ? (
          <ExploreError
            error={explore.recent.error}
            onRetry={() => void explore.recent.refetch()}
          />
        ) : (
          <>
            <TrendingGrid
              error={explore.recent.isError ? explore.recent.error : undefined}
              hasNextPage={explore.recent.hasNextPage}
              isFetchingNextPage={explore.recent.isFetchingNextPage}
              isLoading={explore.recent.isLoading}
              items={explore.recentItems}
              labelledBy="recently-uploaded-grid-title"
              onLoadMore={() => {
                if (
                  explore.recent.hasNextPage &&
                  !explore.recent.isFetchingNextPage
                ) {
                  void explore.recent.fetchNextPage();
                }
              }}
              onRetry={() => void explore.recent.refetch()}
              title="Latest videos"
            />
            <p className="sr-only" aria-live="polite" role="status">
              {explore.recentItems.length > 0
                ? `${explore.recentItems.length} recent videos loaded.`
                : ''}
            </p>
          </>
        )}
      </ExploreSection>
    </motion.div>
  );
}
